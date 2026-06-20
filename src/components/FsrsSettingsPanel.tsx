// ============================================================
// FSRS詳細設定パネル
// ============================================================
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFsrsSettings, saveFsrsSettings, DEFAULT_FSRS_SETTINGS } from "@/db";
import type { FsrsSettings } from "@/types";

export function FsrsSettingsPanel() {
  const [settings, setSettings] = useState<FsrsSettings>({ ...DEFAULT_FSRS_SETTINGS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getFsrsSettings().then(setSettings);
  }, []);

  const update = <K extends keyof FsrsSettings>(key: K, value: FsrsSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFsrsSettings(settings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_FSRS_SETTINGS });
    setSaved(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>FSRS 詳細設定</CardTitle>
        <CardDescription>
          スケジューリングアルゴリズムのパラメータを調整します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 目標保持率 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">目標保持率</label>
            <span className="text-sm text-primary font-mono">{settings.request_retention.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.70}
            max={0.99}
            step={0.01}
            value={settings.request_retention}
            onChange={(e) => update("request_retention", parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.70（間隔長め）</span>
            <span>デフォルト: 0.90</span>
            <span>0.99（頻繁に復習）</span>
          </div>
        </div>

        {/* 最大間隔 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">最大間隔（日）</label>
          <input
            type="number"
            min={1}
            max={36500}
            value={settings.maximum_interval}
            onChange={(e) => update("maximum_interval", parseInt(e.target.value) || 36500)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">デフォルト: 36500（100年）</p>
        </div>

        {/* 1日の新規カード上限 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">1日の新規カード上限</label>
          <input
            type="number"
            min={0}
            max={9999}
            value={settings.new_cards_per_day}
            onChange={(e) => update("new_cards_per_day", parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">デフォルト: 50</p>
        </div>

        {/* 1日の復習上限 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">1日の復習上限</label>
          <input
            type="number"
            min={0}
            max={9999}
            value={settings.reviews_per_day}
            onChange={(e) => update("reviews_per_day", parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">デフォルト: 500</p>
        </div>

        {/* 復習順 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">復習順</label>
          <Select
            value={settings.review_order}
            onValueChange={(v) => update("review_order", v as FsrsSettings["review_order"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">期日順（デフォルト）</SelectItem>
              <SelectItem value="random">ランダム</SelectItem>
              <SelectItem value="difficulty">難易度順</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ウェイト（上級者向け） */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            カスタムウェイト
            <span className="ml-2 text-xs text-muted-foreground font-normal">（上級者向け・空欄でデフォルト）</span>
          </label>
          <textarea
            rows={3}
            placeholder="カンマ区切りで17個の数値（例: 0.4072,1.1829,...）"
            value={settings.w.join(",")}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw.trim() === "") {
                update("w", []);
              } else {
                const nums = raw.split(",").map((n) => parseFloat(n.trim())).filter((n) => !isNaN(n));
                update("w", nums);
              }
            }}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "保存中..." : saved ? "✓ 保存済み" : "設定を保存"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            リセット
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
