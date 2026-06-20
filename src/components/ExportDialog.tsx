// ============================================================
// エクスポートダイアログコンポーネント
// JSON（FSRSステータス付き）またはCSV（純粋データ）エクスポート
// ============================================================
import React, { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportAllData, getCardsByDeck } from "@/db";
import { getAllDecks } from "@/db";
import type { Deck } from "@/types";

interface ExportDialogProps {
  deck?: Deck;
}

export function ExportDialog({ deck }: ExportDialogProps) {
  const [exporting, setExporting] = useState(false);

  const exportJSON = async () => {
    setExporting(true);
    try {
      let data;
      if (deck) {
        const cards = await getCardsByDeck(deck.id);
        data = { deck, cards, exportedAt: Date.now() };
      } else {
        const all = await exportAllData();
        data = { ...all, exportedAt: Date.now() };
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `${deck?.name ?? "kioq_all"}.json`);
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      if (!deck) {
        alert("CSVエクスポートはデッキ単位で行ってください");
        return;
      }
      const cards = await getCardsByDeck(deck.id);
      if (cards.length === 0) return;

      const headers = deck.columns;
      const rows = cards.map((card) =>
        headers.map((h) => {
          const val = card.data[h] ?? "";
          // CSVエスケープ
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
      );

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, `${deck.name}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          データエクスポート
        </CardTitle>
        <CardDescription>
          学習データをファイルにエクスポートします
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          onClick={exportJSON}
          disabled={exporting}
          className="w-full gap-2 justify-start"
        >
          <FileJson className="h-4 w-4" />
          <div className="text-left">
            <div className="font-medium">JSON形式（FSRSステータス付き）</div>
            <div className="text-xs text-muted-foreground">
              学習進捗を含む完全なバックアップ
            </div>
          </div>
        </Button>
        {deck && (
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={exporting}
            className="w-full gap-2 justify-start"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">CSV形式（純粋データのみ）</div>
              <div className="text-xs text-muted-foreground">
                FSRSステータスを含まないCSVデータ
              </div>
            </div>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
