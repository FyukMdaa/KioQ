// ============================================================
// KioQ Dexie.js データベース定義
// ============================================================
import Dexie, { type EntityTable } from "dexie";
import type { Deck, Card, FsrsSettings, CustomStudyConfig } from "@/types";

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

/** 
 * レビュー待ちカード取得
 * FSRS設定（1日の上限など）やカスタム学習設定を反映
 */
export async function getReviewCards(
  deckId: string,
  options?: {
    settings?: FsrsSettings;
    customStudy?: CustomStudyConfig;
  }
): Promise<Card[]> {
  const now = Date.now();
  const settings = options?.settings ?? await getFsrsSettings();
  const custom = options?.customStudy;
  
  let cards = await db.cards.where("deckId").equals(deckId).toArray();

  // 1. 範囲フィルタリング（カスタム学習用）
  if (custom) {
    const deck = await getDeckById(deckId);
    if (deck) {
      // 範囲列によるフィルタ
      if (custom.rangeValues && custom.rangeValues.length > 0 && deck.config.rangeColumn) {
        const rangeCol = deck.config.rangeColumn;
        cards = cards.filter(c => custom.rangeValues!.includes(c.data[rangeCol] ?? ""));
      }
      
      // ID範囲によるフィルタ
      if (custom.idRange && deck.config.idColumn) {
        const idCol = deck.config.idColumn;
        const { from, to } = custom.idRange;
        cards = cards.filter(c => {
          const val = c.data[idCol] ?? "";
          // 文字列としての比較（IDが数値文字列の場合も考慮）
          const isGte = from === "" || val >= from;
          const isLte = to === "" || val <= to;
          return isGte && isLte;
        });
      }
    }
  }

  // 2. FSRS状態による分類
  const dueCards = cards.filter(c => 
    (c.fsrs.state === "Review" || c.fsrs.state === "Relearning" || c.fsrs.state === "Learning") && 
    c.fsrs.due !== undefined && c.fsrs.due <= now
  );
  
  const newCards = cards.filter(c => c.fsrs.state === "New");

  // 3. 並び替え
  if (settings.review_order === "random") {
    dueCards.sort(() => Math.random() - 0.5);
  } else if (settings.review_order === "difficulty") {
    dueCards.sort((a, b) => b.fsrs.difficulty - a.fsrs.difficulty);
  } else {
    // デフォルト: due_date
    dueCards.sort((a, b) => (a.fsrs.due || 0) - (b.fsrs.due || 0));
  }

  // 4. 上限適用
  let finalDue = dueCards;
  if (settings.reviews_per_day > 0) {
    finalDue = dueCards.slice(0, settings.reviews_per_day);
  }

  let finalNew = newCards;
  // カスタム学習で「新規カード上限無視」が有効な場合は制限しない
  if (!custom?.ignoreNewCardLimit && settings.new_cards_per_day > 0) {
    finalNew = newCards.slice(0, settings.new_cards_per_day);
  }

  // 復習カードを優先して結合
  return [...finalDue, ...finalNew];
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

export const DEFAULT_FSRS_SETTINGS: FsrsSettings = {
  request_retention: 0.9,
  maximum_interval: 36500,
  w: [],
  new_cards_per_day: 50,
  reviews_per_day: 500,
  review_order: "due_date",
};

export async function getFsrsSettings(): Promise<FsrsSettings> {
  try {
    const raw = localStorage.getItem(FSRS_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_FSRS_SETTINGS };
    return { ...DEFAULT_FSRS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_FSRS_SETTINGS };
  }
}

export async function saveFsrsSettings(settings: FsrsSettings): Promise<void> {
  localStorage.setItem(FSRS_SETTINGS_KEY, JSON.stringify(settings));
}

/** デッキ名を更新 */
export async function renameDeck(deckId: string, newName: string): Promise<void> {
  const deck = await db.decks.get(deckId);
  if (!deck) return;
  await db.decks.put({ ...deck, name: newName, updatedAt: Date.now() });
}
