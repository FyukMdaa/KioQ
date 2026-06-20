// ============================================================
// デッキ設定コンポーネント
// 表面/裏面の列選択、フィルター設定
// ============================================================
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertDeck } from "@/db";
import type { Deck } from "@/types";

interface DeckConfigProps {
  deck: Deck;
  onUpdate: (deck: Deck) => void;
}

export function DeckConfig({ deck, onUpdate }: DeckConfigProps) {
  const [frontColumns, setFrontColumns] = useState<string[]>(
    deck.config.frontColumns
  );
  const [backColumns, setBackColumns] = useState<string[]>(
    deck.config.backColumns
  );
  const [idColumn, setIdColumn] = useState<string | undefined>(
    deck.config.idColumn
  );
  const [rangeColumn, setRangeColumn] = useState<string | undefined>(
    deck.config.rangeColumn
  );
  const [saving, setSaving] = useState(false);

  const toggleColumn = (
    column: string,
    type: "front" | "back"
  ) => {
    const current = type === "front" ? frontColumns : backColumns;
    const other = type === "front" ? backColumns : frontColumns;
    const setCurr = type === "front" ? setFrontColumns : setBackColumns;
    const setOther = type === "front" ? setBackColumns : setFrontColumns;

    if (current.includes(column)) {
      setCurr(current.filter((c) => c !== column));
    } else {
      setCurr([...current, column]);
      if (other.includes(column)) {
        setOther(other.filter((c) => c !== column));
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: Deck = {
        ...deck,
        config: {
          ...deck.config,
          frontColumns,
          backColumns,
          idColumn,
          rangeColumn,
        },
        updatedAt: Date.now(),
      };
      await upsertDeck(updated);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>デッキ設定</CardTitle>
        <CardDescription>
          表面・裏面に表示する列や、ID列・範囲列の設定
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ID列・範囲列 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">ID列</label>
            <Select value={idColumn ?? ""} onValueChange={(v) => setIdColumn(v || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="なし（行番号）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし（行番号）</SelectItem>
                {deck.columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">範囲列</label>
            <Select value={rangeColumn ?? ""} onValueChange={(v) => setRangeColumn(v || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="なし" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {deck.columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 表示列の設定 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">表示列の設定</h3>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">列名</th>
                  <th className="px-3 py-2 text-center font-medium">表面</th>
                  <th className="px-3 py-2 text-center font-medium">裏面</th>
                </tr>
              </thead>
              <tbody>
                {deck.columns.map((col) => (
                  <tr key={col} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{col}</td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={frontColumns.includes(col)}
                        onCheckedChange={() => toggleColumn(col, "front")}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={backColumns.includes(col)}
                        onCheckedChange={() => toggleColumn(col, "back")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "保存中..." : "設定を保存"}
        </Button>
      </CardContent>
    </Card>
  );
}
