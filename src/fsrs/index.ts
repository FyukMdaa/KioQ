// ============================================================
// KioQ FSRSエンジンラッパー
// ts-fsrs を用いた間隔反復スケジューリング
// ============================================================
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type Grade,
  type RecordLogItem,
  State,
  Rating,
} from "ts-fsrs";
import type { Card, FsrsState, Rating as AppRating } from "@/types";

const params = generatorParameters({ request_retention: 0.9 });
const engine = fsrs(params);

/** アプリのRating → ts-fsrs Grade 変換 */
function toGrade(rating: AppRating): Grade {
  const map: Record<AppRating, Grade> = {
    Again: Rating.Again,
    Hard: Rating.Hard,
    Good: Rating.Good,
    Easy: Rating.Easy,
  };
  return map[rating];
}

/** ts-fsrs Card → アプリの FsrsState 変換 */
function toFsrsState(card: FsrsCard): FsrsState {
  const stateMap: Record<State, FsrsState["state"]> = {
    [State.New]: "New",
    [State.Learning]: "Learning",
    [State.Review]: "Review",
    [State.Relearning]: "Relearning",
  };
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    interval: card.scheduled_days,
    repeats: card.reps,
    lapses: card.lapses,
    state: stateMap[card.state],
    last_review: card.last_review
      ? new Date(card.last_review).getTime()
      : undefined,
    due: card.due ? new Date(card.due).getTime() : undefined,
  };
}

/** 新規カード用の初期FSRS状態を生成 */
export function createInitialFsrsState(): FsrsState {
  const emptyCard = createEmptyCard();
  return toFsrsState(emptyCard);
}

/** アプリのCardをts-fsrs Cardに変換 */
function toFsrsCard(card: Card): FsrsCard {
  const stateMap: Record<FsrsState["state"], State> = {
    New: State.New,
    Learning: State.Learning,
    Review: State.Review,
    Relearning: State.Relearning,
  };

  const now = new Date();
  return {
    due: card.fsrs.due ? new Date(card.fsrs.due) : now,
    stability: card.fsrs.stability,
    difficulty: card.fsrs.difficulty,
    elapsed_days: 0,
    scheduled_days: card.fsrs.interval,
    reps: card.fsrs.repeats,
    lapses: card.fsrs.lapses,
    state: stateMap[card.fsrs.state],
    last_review: card.fsrs.last_review
      ? new Date(card.fsrs.last_review)
      : undefined,
  };
}

/**
 * レビューを実行し、次回スケジュールを計算
 * @param card 対象カード
 * @param rating ユーザーの評価
 * @returns 更新後のFsrsStateとスケジュール情報
 */
export function reviewCard(
  card: Card,
  rating: AppRating
): { fsrs: FsrsState; scheduledDays: number; nextReview: number } {
  const fsrsCard = toFsrsCard(card);
  const grade = toGrade(rating);
  const now = new Date();

  const scheduling = engine.repeat(fsrsCard, now);
  const recordLog: RecordLogItem = scheduling[grade];

  const newFsrsState = toFsrsState(recordLog.card);

  return {
    fsrs: newFsrsState,
    scheduledDays: recordLog.card.scheduled_days,
    nextReview: newFsrsState.due ?? Date.now(),
  };
}

/**
 * レビュー時に各ボタンの予測インターバルを取得
 * @param card 対象カード
 * @returns 各Ratingに対応する予測インターバル情報
 */
export function getPreviewIntervals(
  card: Card
): Record<AppRating, { interval: number; label: string }> {
  const fsrsCard = toFsrsCard(card);
  const now = new Date();
  const scheduling = engine.repeat(fsrsCard, now);

  const ratings: AppRating[] = ["Again", "Hard", "Good", "Easy"];
  const grades: Grade[] = [
    Rating.Again,
    Rating.Hard,
    Rating.Good,
    Rating.Easy,
  ];

  const result: Record<AppRating, { interval: number; label: string }> = {} as any;

  ratings.forEach((r, i) => {
    const log: RecordLogItem = scheduling[grades[i]];
    const days = log.card.scheduled_days;
    result[r] = {
      interval: days,
      label: formatIntervalLabel(days),
    };
  });

  return result;
}

/** インターバル日数を人間が読みやすい形式にフォーマット */
function formatIntervalLabel(days: number): string {
  if (days < 1) return "10分後";
  if (days < 1.5) return "1日後";
  if (days < 7) return `${Math.round(days)}日後`;
  if (days < 30) return `${Math.round(days / 7)}週間後`;
  if (days < 365) return `${Math.round(days / 30)}ヶ月後`;
  return `${Math.round(days / 365)}年後`;
}

/**
 * デッキの統計情報を計算
 */
export function getDeckStats(cards: Card[]): {
  total: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  relearningCount: number;
} {
  return {
    total: cards.length,
    newCount: cards.filter((c) => c.fsrs.state === "New").length,
    learningCount: cards.filter((c) => c.fsrs.state === "Learning").length,
    reviewCount: cards.filter((c) => c.fsrs.state === "Review").length,
    relearningCount: cards.filter((c) => c.fsrs.state === "Relearning").length,
  };
}
