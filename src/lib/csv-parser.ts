// ============================================================
// KioQ CSVパーサー
// PapaParse を用いたCSV読み込み（文字コード自動判別対応）
// ============================================================
import Papa from "papaparse";
import type { Deck, Card, DeckConfig } from "@/types";
import { createInitialFsrsState } from "@/fsrs";
import { upsertDeck, bulkUpsertCards } from "@/db";

/** CSVパース結果 */
export interface CSVParseResult {
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

/**
 * ファイルの文字コードを検出（UTF-8 / Shift-JIS）
 */
function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // BOM チェック（UTF-8 with BOM）
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }

  // Shift-JIS チェック：日本語特有のバイトパターンを探す
  let sjisScore = 0;
  let utf8Score = 0;

  for (let i = 0; i < Math.min(bytes.length, 4096); i++) {
    const b = bytes[i];
    // Shift-JISの2バイト文字範囲（漢字・カタカナ）
    if (
      ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xef)) &&
      i + 1 < bytes.length
    ) {
      const b2 = bytes[i + 1];
      if (
        (b2 >= 0x40 && b2 <= 0x7e) ||
        (b2 >= 0x80 && b2 <= 0xfc)
      ) {
        sjisScore++;
        i++; // 2バイトスキップ
      }
    }
    // UTF-8の3バイト文字パターン
    if (b >= 0xc0 && b <= 0xdf && i + 1 < bytes.length) {
      if (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xbf) {
        utf8Score++;
      }
    }
  }

  return sjisScore > utf8Score ? "shift-jis" : "utf-8";
}

/**
 * ArrayBufferを指定エンコーディングで文字列に変換
 */
function decodeBuffer(buffer: ArrayBuffer, encoding: string): string {
  const decoder = new TextDecoder(encoding === "shift-jis" ? "shift_jis" : "utf-8");
  return decoder.decode(buffer);
}

/**
 * CSVファイルをパースして結果を返す
 * @param file CSVファイル
 * @param encoding 文字コード指定（省略時は自動判別）
 */
export async function parseCSV(
  file: File,
  encoding?: string
): Promise<CSVParseResult> {
  const buffer = await file.arrayBuffer();
  const detectedEncoding = encoding ?? detectEncoding(buffer);
  const text = decodeBuffer(buffer, detectedEncoding);

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      encoding: detectedEncoding === "shift-jis" ? "Shift_JIS" : "UTF-8",
      complete: (results) => {
        if (results.errors.length > 0) {
          // 軽微なエラーは無視して続行
          console.warn("CSV parse warnings:", results.errors);
        }
        const columns = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        resolve({ columns, rows, rowCount: rows.length });
      },
      error: (error) => {
        reject(new Error(`CSVパースエラー: ${error.message}`));
      },
    });
  });
}

/**
 * パース済みCSVデータからデッキとカードを生成してDBに保存
 * @param fileName CSVファイル名
 * @param parseResult パース結果
 * @param config デッキ設定
 */
export async function importCSVToDatabase(
  fileName: string,
  parseResult: CSVParseResult,
  config?: Partial<DeckConfig>
): Promise<{ deck: Deck; cardCount: number }> {
  const deckId = crypto.randomUUID();
  const now = Date.now();

  const defaultConfig: DeckConfig = {
    frontColumns: parseResult.columns.length > 1
      ? [parseResult.columns[0]]
      : parseResult.columns,
    backColumns: parseResult.columns.length > 1
      ? parseResult.columns.slice(1)
      : [],
    idColumn: undefined,
    rangeColumn: undefined,
    filters: [],
    ...config,
  };

  const deck: Deck = {
    id: deckId,
    name: fileName.replace(/\.csv$/i, ""),
    columns: parseResult.columns,
    config: defaultConfig,
    updatedAt: now,
  };

  const cards: Card[] = parseResult.rows.map((row, index) => ({
    id: crypto.randomUUID(),
    deckId,
    rowId: defaultConfig.idColumn && row[defaultConfig.idColumn]
      ? row[defaultConfig.idColumn]
      : String(index + 1),
    data: row,
    fsrs: createInitialFsrsState(),
  }));

  await upsertDeck(deck);
  await bulkUpsertCards(cards);

  return { deck, cardCount: cards.length };
}
