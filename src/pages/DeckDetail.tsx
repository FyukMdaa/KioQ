// ============================================================
// デッキ詳細ページ
// ============================================================
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  BookOpen,
  BarChart3,
  Table,
  Settings2,
  Pencil,
  Check,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeckConfig } from "@/components/DeckConfig";
import { ExportDialog } from "@/components/ExportDialog";
import { CsvViewer } from "@/components/CsvViewer";
import { CustomStudyDialog } from "@/components/CustomStudyDialog";
import { getDeckById, getCardsByDeck, renameDeck } from "@/db";
import { getDeckStats } from "@/fsrs";
import { formatDate, calculateProgress } from "@/lib/utils";
import type { Deck } from "@/types";

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    newCount: 0,
    learningCount: 0,
    reviewCount: 0,
    relearningCount: 0,
    dueCount: 0,
  });
  const [activeTab, setActiveTab] = useState<"stats" | "csv" | "config" | "export">("stats");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [customStudyOpen, setCustomStudyOpen] = useState(false);

  const loadData = async () => {
    if (!deckId) return;
    const d = await getDeckById(deckId);
    if (d) {
      setDeck(d);
      setNameInput(d.name);
      const cards = await getCardsByDeck(d.id);
      setStats(getDeckStats(cards));
    }
  };

  useEffect(() => {
    loadData();
  }, [deckId]);

  const handleRename = async () => {
    if (!deck || !nameInput.trim()) return;
    await renameDeck(deck.id, nameInput.trim());
    setDeck((prev) => prev ? { ...prev, name: nameInput.trim() } : prev);
    setEditingName(false);
  };

  if (!deck) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const progress = calculateProgress(stats);
  const canStudy = stats.dueCount > 0 || stats.newCount > 0 || stats.learningCount > 0;

  const tabs = [
    { key: "stats" as const, label: "統計", icon: BarChart3 },
    { key: "csv" as const, label: "カード", icon: Table },
    { key: "config" as const, label: "設定", icon: Settings2 },
    { key: "export" as const, label: "出力", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="flex-1 px-2 py-1 rounded border border-input bg-background text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="icon" variant="ghost" onClick={handleRename}><Check className="h-4 w-4 text-green-500" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-bold truncate">{deck.name}</h1>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingName(true)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            最終更新: {formatDate(deck.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="shrink-0" 
            title="カスタム学習"
            onClick={() => setCustomStudyOpen(true)}
          >
            <Zap className="h-4 w-4 text-amber-500" />
          </Button>
          <Link to={`/study/${deck.id}`}>
            <Button className="gap-2 shrink-0" disabled={!canStudy}>
              <Play className="h-4 w-4" />
              学習
            </Button>
          </Link>
        </div>
      </div>

      {/* Ankiスタイル枚数バッジ */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2">
          <span className="text-lg font-bold text-blue-500">{stats.newCount}</span>
          <span className="text-xs text-muted-foreground">新規</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-2">
          <span className="text-lg font-bold text-orange-500">{stats.learningCount + stats.relearningCount}</span>
          <span className="text-xs text-muted-foreground">学習中</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2">
          <span className="text-lg font-bold text-green-500">{stats.reviewCount}</span>
          <span className="text-xs text-muted-foreground">復習</span>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex-1 justify-center ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "stats" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">学習進捗</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">達成率</span>
                <span className="text-2xl font-bold">{progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-secondary">
                <div
                  className="h-3 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">合計</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-500">{stats.newCount}</div>
                  <div className="text-xs text-muted-foreground">新規</div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-green-500">{stats.dueCount}</div>
                  <div className="text-xs text-muted-foreground">期日到来</div>
                </div>
                <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-500">{stats.relearningCount}</div>
                  <div className="text-xs text-muted-foreground">再学習</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">列構成</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {deck.columns.map((col) => (
                  <Badge
                    key={col}
                    variant={
                      deck.config.frontColumns.includes(col)
                        ? "default"
                        : deck.config.backColumns.includes(col)
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {col}
                    {deck.config.frontColumns.includes(col) && " (表面)"}
                    {deck.config.backColumns.includes(col) && " (裏面)"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "csv" && <CsvViewer deck={deck} />}

      {activeTab === "config" && (
        <DeckConfig deck={deck} onUpdate={setDeck} />
      )}

      {activeTab === "export" && <ExportDialog deck={deck} />}

      {/* カスタム学習ダイアログ */}
      <CustomStudyDialog
        deck={deck}
        open={customStudyOpen}
        onOpenChange={setCustomStudyOpen}
      />
    </div>
  );
}
