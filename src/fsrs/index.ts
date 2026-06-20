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
import type { Card, FsrsState, Rating as AppRating, FsrsSettings } from "@/types";

let engineInstance: ReturnType<typeof fsrs> | null = null;
let lastSettings: string = "";

export function getEngine(settings?: Partial<FsrsSettings>) {
  const key = JSON.stringify(settings ?? {});
  if (!engineInstance || key !== lastSettings) {
    const wParam = settings?.w;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extraParams: any = wParam && wParam.length > 0 ? { w: wParam } : {};
    const params = generatorParameters({
      request_retention: settings?.request_retention ?? 0.9,
      maximum_interval: settings?.maximum_interval ?? 36500,
      ...extraParams,
    });
    engineInstance = fsrs(params);
    lastSettings = key;
  }
  return engineInstance;
}

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
 */
export function reviewCard(
  card: Card,
  rating: AppRating,
  settings?: Partial<FsrsSettings>
): { fsrs: FsrsState; scheduledDays: number; nextReview: number } {
  const fsrsCard = toFsrsCard(card);
  const grade = toGrade(rating);
  const now = new Date();

  const scheduling = getEngine(settings).repeat(fsrsCard, now);
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
 */
export function getPreviewIntervals(
  card: Card,
  settings?: Partial<FsrsSettings>
): Record<AppRating, { interval: number; label: string }> {
  const fsrsCard = toFsrsCard(card);
  const now = new Date();
  const scheduling = getEngine(settings).repeat(fsrsCard, now);

  const ratings: AppRating[] = ["Again", "Hard", "Good", "Easy"];
  const grades: Grade[] = [
    Rating.Again,
    Rating.Hard,
    Rating.Good,
    Rating.Easy,
  ];

  const result: Record<AppRating, { interval: number; label: string }> = {} as never;

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
  dueCount: number;
} {
  const now = Date.now();
  return {
    total: cards.length,
    newCount: cards.filter((c) => c.fsrs.state === "New").length,
    learningCount: cards.filter((c) => c.fsrs.state === "Learning").length,
    reviewCount: cards.filter(
      (c) => c.fsrs.state === "Review" && c.fsrs.due !== undefined && c.fsrs.due <= now
    ).length,
    relearningCount: cards.filter((c) => c.fsrs.state === "Relearning").length,
    dueCount: cards.filter(
      (c) => c.fsrs.state !== "New" && c.fsrs.due !== undefined && c.fsrs.due <= now
    ).length,
  };
}
