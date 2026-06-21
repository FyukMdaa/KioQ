import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getCardsByDeck } from "@/db";
import type { Deck, CustomStudyConfig } from "@/types";

interface CustomStudyDialogProps {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomStudyDialog({ deck, open, onOpenChange }: CustomStudyDialogProps) {
  const navigate = useNavigate();
  const [rangeValues, setRangeValues] = useState<string[]>([]);
  const [availableRangeValues, setAvailableRangeValues] = useState<string[]>([]);
  const [idFrom, setIdFrom] = useState("");
  const [idTo, setIdTo] = useState("");
  const [ignoreLimit, setIgnoreLimit] = useState(true);

  useEffect(() => {
    if (open && deck.config.rangeColumn) {
      getCardsByDeck(deck.id).then((cards) => {
        const values = new Set<string>();
        const col = deck.config.rangeColumn!;
        cards.forEach((c) => {
          const val = c.data[col];
          if (val) values.add(val);
        });
        setAvailableRangeValues(Array.from(values).sort());
      });
    }
  }, [open, deck.id, deck.config.rangeColumn]);

  const handleStart = () => {
    const config: CustomStudyConfig = {
      deckId: deck.id,
      rangeValues: rangeValues.length > 0 ? rangeValues : undefined,
      idRange: (idFrom || idTo) ? { from: idFrom, to: idTo } : undefined,
      ignoreNewCardLimit: ignoreLimit,
    };

    // セッションストレージに一時的に保存してStudyPageで読み込む
    sessionStorage.setItem(`custom_study_${deck.id}`, JSON.stringify(config));
    navigate(`/study/${deck.id}?custom=true`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>カスタム学習</DialogTitle>
          <DialogDescription>
            学習する範囲や条件を一時的に変更して学習を開始します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 範囲列フィルタ */}
          {deck.config.rangeColumn && (
            <div className="space-y-3">
              <label className="text-sm font-medium">範囲で絞り込む ({deck.config.rangeColumn})</label>
              <div className="max-h-32 overflow-y-auto rounded-md border p-2 space-y-2">
                {availableRangeValues.length > 0 ? (
                  availableRangeValues.map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <Checkbox
                        id={`range-${val}`}
                        checked={rangeValues.includes(val)}
                        onCheckedChange={(checked) => {
                          if (checked) setRangeValues([...rangeValues, val]);
                          else setRangeValues(rangeValues.filter((v) => v !== val));
                        }}
                      />
                      <label htmlFor={`range-${val}`} className="text-sm truncate">{val}</label>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground p-2">値が見つかりません</p>
                )}
              </div>
            </div>
          )}

          {/* ID範囲フィルタ */}
          {deck.config.idColumn && (
            <div className="space-y-3">
              <label className="text-sm font-medium">ID範囲で絞り込む ({deck.config.idColumn})</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="開始ID"
                  value={idFrom}
                  onChange={(e) => setIdFrom(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground">〜</span>
                <Input
                  placeholder="終了ID"
                  value={idTo}
                  onChange={(e) => setIdTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* オプション */}
          <div className="space-y-3">
            <label className="text-sm font-medium">オプション</label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ignore-limit"
                checked={ignoreLimit}
                onCheckedChange={(checked) => setIgnoreLimit(!!checked)}
              />
              <label htmlFor="ignore-limit" className="text-sm">
                新規カードの1日上限を無視する
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleStart}>学習開始</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
