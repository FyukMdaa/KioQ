// ============================================================
// CSVビューアーコンポーネント
// ============================================================
import { useState, useEffect, useMemo } from "react";
import { Search, Info } from "lucide-react";
import { getCardsByDeck } from "@/db";
import type { Deck, Card } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CsvViewerProps {
  deck: Deck;
}

export function CsvViewer({ deck }: CsvViewerProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCardsByDeck(deck.id).then((c) => {
      setCards(c);
      setLoading(false);
    });
  }, [deck.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;

    try {
      // スペース区切りで分割（AND検索）
      const terms = search.trim().split(/\s+/);
      
      return cards.filter((card) => {
        return terms.every((term) => {
          // 列指定検索 (col:value)
          if (term.includes(":")) {
            const [colName, val] = term.split(":");
            const targetCol = deck.columns.find(c => c.toLowerCase() === colName.toLowerCase());
            if (targetCol) {
              const cellValue = (card.data[targetCol] ?? "").toLowerCase();
              return cellValue.includes(val.toLowerCase());
            }
          }
          
          // 通常の全体検索
          return deck.columns.some((col) =>
            (card.data[col] ?? "").toLowerCase().includes(term.toLowerCase())
          );
        });
      });
    } catch (e) {
      console.error("Search error:", e);
      return cards;
    }
  }, [cards, search, deck.columns]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 検索 */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="検索 (スペースでAND検索、col:value で列指定)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-10 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 space-y-2">
                <p className="font-bold text-xs">高度な検索ヒント:</p>
                <ul className="text-[11px] list-disc pl-4 space-y-1">
                  <li><strong>スペース区切り</strong>: AND検索になります。</li>
                  <li><strong>列名:検索語</strong>: 特定の列内を検索します。 (例: <code>単語:apple</code>)</li>
                  <li>大文字小文字は区別されません。</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} / {cards.length} 件</p>

      {/* テーブル */}
      <div className="rounded-lg border overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">#</th>
              {deck.columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {col}
                  {deck.config.frontColumns.includes(col) && (
                    <span className="ml-1 text-[10px] text-primary">表</span>
                  )}
                  {deck.config.backColumns.includes(col) && (
                    <span className="ml-1 text-[10px] text-green-500">裏</span>
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">状態</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => (
              <tr key={card.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{card.rowId}</td>
                {deck.columns.map((col) => (
                  <td key={col} className="px-3 py-2 max-w-[200px] truncate">
                    {card.data[col] ?? ""}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    card.fsrs.state === "New" ? "bg-blue-500/10 text-blue-500" :
                    card.fsrs.state === "Learning" ? "bg-orange-500/10 text-orange-500" :
                    card.fsrs.state === "Review" ? "bg-green-500/10 text-green-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    {card.fsrs.state === "New" ? "新規" :
                     card.fsrs.state === "Learning" ? "学習中" :
                     card.fsrs.state === "Review" ? "復習" : "再学習"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
