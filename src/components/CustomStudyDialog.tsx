import { useState } from "react";
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
import type { Deck, CustomStudyConfig } from "@/types";

interface CustomStudyDialogProps {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomStudyDialog({ deck, open, onOpenChange }: CustomStudyDialogProps) {
  const navigate = useNavigate();
  // 範囲（From/To）の状態管理に変更
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [idFrom, setIdFrom] = useState("");
  const [idTo, setIdTo] = useState("");
  const [ignoreLimit, setIgnoreLimit] = useState(true);

  const handleStart = () => {
    // カスタム学習の型定義（CustomStudyConfig）に合わせて、
    // rangeValues または新しく定義する rangeRange などにマッピングしてください。
    // ここでは一時的に既存の型を想定、あるいは適宜バックエンド/ロジック側を調整してください。
    const config: CustomStudyConfig = {
      deckId: deck.id,
      // 既存の rangeValues が配列前提の場合、以下のように From/To の配列にするか、
      // 型定義側を `{ from: string; to: string }` に拡張して対応してください。
      rangeValues: (rangeFrom || rangeTo) ? [rangeFrom, rangeTo] : undefined,
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
          {/* 範囲列フィルタ（開始・終了入力方式へ変更） */}
          {deck.config.rangeColumn && (
            <div className="space-y-3">
              <label className="text-sm font-medium">範囲で絞り込む ({deck.config.rangeColumn})</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="開始"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground">〜</span>
                <Input
                  placeholder="終了"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="h-8 text-xs"
                />
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
