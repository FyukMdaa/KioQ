// ============================================================
// KioQ Dexie.js データベース定義
// ============================================================
import Dexie, { type EntityTable } from "dexie";
import type { Deck, Card } from "@/types";

class KioQDatabase extends Dexie {
  decks!: EntityTable<Deck, "id">;
  cards!: EntityTable<Card, "id">;

  constructor() {
    super("kioq_db");

    this.version(1).stores({
      decks: "id, name, updatedAt",
      cards: "id, deckId, rowId, [deckId+rowId]",
    });
  }
}

export const db = new KioQDatabase();

// ---- ヘルパー関数 ----

/** 全デッキ取得 */
export async function getAllDecks(): Promise<Deck[]> {
  return db.decks.toArray();
}

/** IDでデッキ取得 */
export async function getDeckById(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

/** デッキを追加または更新 */
export async function upsertDeck(deck: Deck): Promise<void> {
  await db.decks.put({ ...deck, updatedAt: Date.now() });
}

/** デッキ削除（関連カードも削除） */
export async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction("rw", [db.decks, db.cards], async () => {
    await db.decks.delete(deckId);
    await db.cards.where("deckId").equals(deckId).delete();
  });
}

/** デッキ内の全カード取得 */
export async function getCardsByDeck(deckId: string): Promise<Card[]> {
  return db.cards.where("deckId").equals(deckId).toArray();
}

/** レビュー待ちカード取得（due が現在時刻以前、または New のカード） */
export async function getReviewCards(
  deckId: string,
  filters?: { column: string; values: string[] }[]
): Promise<Card[]> {
  const now = Date.now();
  let cards = await db.cards.where("deckId").equals(deckId).toArray();

  // フィルター適用
  if (filters && filters.length > 0) {
    cards = cards.filter((card) =>
      filters.every((f) => f.values.includes(card.data[f.column] ?? ""))
    );
  }

  // レビュー対象のカードをフィルタリング
  return cards.filter((card) => {
    if (card.fsrs.state === "New") return true;
    if (card.fsrs.due && card.fsrs.due <= now) return true;
    return false;
  });
}

/** カードを追加または更新 */
export async function upsertCard(card: Card): Promise<void> {
  await db.cards.put(card);
}

/** 複数カードを一括追加 */
export async function bulkUpsertCards(cards: Card[]): Promise<void> {
  await db.cards.bulkPut(cards);
}

/** 全データをエクスポート用に取得 */
export async function exportAllData(): Promise<{
  decks: Deck[];
  cards: Card[];
}> {
  const [decks, cards] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
  ]);
  return { decks, cards };
}

/** データをインポート（既存データを置き換え） */
export async function importAllData(data: {
  decks: Deck[];
  cards: Card[];
}): Promise<void> {
  await db.transaction("rw", [db.decks, db.cards], async () => {
    await db.decks.clear();
    await db.cards.clear();
    await db.decks.bulkAdd(data.decks);
    await db.cards.bulkAdd(data.cards);
  });
}

/** データベースをクリア */
export async function clearDatabase(): Promise<void> {
  await db.transaction("rw", [db.decks, db.cards], async () => {
    await db.decks.clear();
    await db.cards.clear();
  });
}

// ---- FSRS設定 ----
const FSRS_SETTINGS_KEY = "fsrs_settings";

export const DEFAULT_FSRS_SETTINGS: import("@/types").FsrsSettings = {
  request_retention: 0.9,
  maximum_interval: 36500,
  w: [],
  new_cards_per_day: 50,
  reviews_per_day: 500,
  review_order: "due_date",
};

export async function getFsrsSettings(): Promise<import("@/types").FsrsSettings> {
  try {
    const raw = localStorage.getItem(FSRS_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_FSRS_SETTINGS };
    return { ...DEFAULT_FSRS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_FSRS_SETTINGS };
  }
}

export async function saveFsrsSettings(settings: import("@/types").FsrsSettings): Promise<void> {
  localStorage.setItem(FSRS_SETTINGS_KEY, JSON.stringify(settings));
}

/** デッキ名を更新 */
export async function renameDeck(deckId: string, newName: string): Promise<void> {
  const deck = await db.decks.get(deckId);
  if (!deck) return;
  await db.decks.put({ ...deck, name: newName, updatedAt: Date.now() });
}
