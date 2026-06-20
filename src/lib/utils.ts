// ============================================================
// KioQ ユーティリティ関数
// ============================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind クラス名をマージ */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** UUIDを生成 */
export function generateId(): string {
  return crypto.randomUUID();
}

/** 日時をフォーマット */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/** 相対時間をフォーマット */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return "たった今";
}

/** ファイルサイズをフォーマット */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** デッキの進捗率を計算 */
export function calculateProgress(cards: {
  total: number;
  newCount: number;
}): number {
  if (cards.total === 0) return 0;
  const reviewed = cards.total - cards.newCount;
  return Math.round((reviewed / cards.total) * 100);
}
