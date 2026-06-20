// ============================================================
// KioQ 型定義
// ============================================================

/** デッキ（単語帳）のメタ情報 */
export interface Deck {
  id: string; // UUID
  name: string; // デッキ名（CSVファイル名など）
  columns: string[]; // CSVのヘッダー行（列名リスト）
  config: DeckConfig; // 表示設定・範囲設定などのカスタム情報
  updatedAt: number; // 最終更新日時（Timestamp）
}

/** デッキの設定 */
export interface DeckConfig {
  /** 表面（問題）に表示する列名のリスト（順序付き） */
  frontColumns: string[];
  /** 裏面（解答）に表示する列名のリスト（順序付き） */
  backColumns: string[];
  /** 一意の識別子として使用する列名 */
  idColumn?: string;
  /** 範囲指定に使用する列名 */
  rangeColumn?: string;
  /** フィルター条件 */
  filters: DeckFilter[];
}

/** デッキのフィルター条件 */
export interface DeckFilter {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";
  value: string;
}

/** カードデータ＆FSRSステータス */
export interface Card {
  id: string; // UUID
  deckId: string; // 所属する decks.id
  rowId: string; // CSVのID列の値、または行番号
  data: Record<string, string>; // CSVの1行データ
  fsrs: FsrsState; // FSRSパラメータ
}

/** FSRSの各カード状態 */
export interface FsrsState {
  stability: number;
  difficulty: number;
  interval: number;
  repeats: number;
  lapses: number;
  state: "New" | "Learning" | "Review" | "Relearning";
  last_review?: number; // Timestamp
  due?: number; // 次回レビュー予定日時
}

/** FSRS評価ボタンの種類 */
export type Rating = "Again" | "Hard" | "Good" | "Easy";

/** 同期ステータス */
export type SyncStatus = "idle" | "syncing" | "success" | "error" | "conflict";

/** Google Drive 同期データ */
export interface SyncData {
  decks: Deck[];
  cards: Card[];
  updatedAt: number;
}

/** コンフリクト解決方法 */
export type ConflictResolution = "cloud" | "local" | "newest";

/** FSRSグローバル設定 */
export interface FsrsSettings {
  request_retention: number;      // 目標保持率 (0.7–0.99, default: 0.9)
  maximum_interval: number;       // 最大間隔日数 (default: 36500)
  w: number[];                    // FSRSウェイト（空配列=デフォルト）
  new_cards_per_day: number;      // 1日の新規カード上限 (default: 50)
  reviews_per_day: number;        // 1日の復習上限 (default: 500)
  review_order: "due_date" | "random" | "difficulty"; // 復習順
}

/** カスタム学習設定 */
export interface CustomStudyConfig {
  deckId: string;
  rangeValues?: string[];         // 範囲列でフィルタ
  idRange?: { from: string; to: string }; // ID範囲
  ignoreNewCardLimit: boolean;    // 新規カード上限を無視
}
