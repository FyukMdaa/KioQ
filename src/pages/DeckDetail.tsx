// ============================================================
// デッキ詳細ページ
// ============================================================
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeckConfig } from "@/components/DeckConfig";
import { ExportDialog } from "@/components/ExportDialog";
import { getDeckById, getCardsByDeck } from "@/db";
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
  });
  const [activeTab, setActiveTab] = useState<"stats" | "config" | "export">("stats");

  const loadData = async () => {
    if (!deckId) return;
    const d = await getDeckById(deckId);
    if (d) {
      setDeck(d);
      const cards = await getCardsByDeck(d.id);
      setStats(getDeckStats(cards));
    }
  };

  useEffect(() => {
    loadData();
  }, [deckId]);

  if (!deck) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const progress = calculateProgress(stats);
  const reviewToday = stats.learningCount + stats.reviewCount + stats.relearningCount;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          <p className="text-sm text-muted-foreground">
            最終更新: {formatDate(deck.updatedAt)}
          </p>
        </div>
        <Link to={`/study/${deck.id}`}>
          <Button className="gap-2" disabled={reviewToday === 0 && stats.newCount === 0}>
            <Play className="h-4 w-4" />
            学習開始
          </Button>
        </Link>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { key: "stats" as const, label: "統計", icon: BarChart3 },
          { key: "config" as const, label: "設定", icon: BookOpen },
          { key: "export" as const, label: "エクスポート", icon: BarChart3 },
        ].map((tab) => {
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
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "stats" && (
        <div className="space-y-4">
          {/* 進捗サマリー */}
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
                  <div className="text-2xl font-bold text-green-500">{reviewToday}</div>
                  <div className="text-xs text-muted-foreground">復習対象</div>
                </div>
                <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-500">{stats.relearningCount}</div>
                  <div className="text-xs text-muted-foreground">再学習</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 列情報 */}
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

      {activeTab === "config" && (
        <DeckConfig deck={deck} onUpdate={setDeck} />
      )}

      {activeTab === "export" && <ExportDialog deck={deck} />}
    </div>
  );
}
