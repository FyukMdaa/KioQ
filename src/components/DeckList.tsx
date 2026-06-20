// ============================================================
// デッキ一覧コンポーネント
// ============================================================
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Trash2,
  Play,
  Download,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllDecks, deleteDeck, getCardsByDeck } from "@/db";
import { getDeckStats } from "@/fsrs";
import { formatDate, calculateProgress } from "@/lib/utils";
import type { Deck } from "@/types";

interface DeckWithStats extends Deck {
  stats: {
    total: number;
    newCount: number;
    learningCount: number;
    reviewCount: number;
    relearningCount: number;
  };
}

export function DeckList() {
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDecks = async () => {
    try {
      const allDecks = await getAllDecks();
      const decksWithStats = await Promise.all(
        allDecks.map(async (deck) => {
          const cards = await getCardsByDeck(deck.id);
          const stats = getDeckStats(cards);
          return { ...deck, stats };
        })
      );
      setDecks(decksWithStats);
    } catch (error) {
      console.error("デッキの読み込みに失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const handleDelete = async (deckId: string) => {
    if (!confirm("このデッキを削除しますか？関連する全カードも削除されます。")) return;
    await deleteDeck(deckId);
    loadDecks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold text-muted-foreground">
          デッキがありません
        </h2>
        <p className="text-muted-foreground">
          CSVファイルをインポートして学習を始めましょう
        </p>
        <Link to="/import">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            CSVをインポート
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">マイデッキ</h1>
        <Link to="/import">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            インポート
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => {
          const progress = calculateProgress(deck.stats);
          const reviewCount =
            deck.stats.learningCount +
            deck.stats.reviewCount +
            deck.stats.relearningCount;

          return (
            <Card key={deck.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{deck.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(deck.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  最終更新: {formatDate(deck.updatedAt)}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {/* 進捗バー */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>進捗</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* 統計バッジ */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">
                    新規: {deck.stats.newCount}
                  </Badge>
                  <Badge variant="default">
                    復習: {reviewCount}
                  </Badge>
                  <Badge variant="outline">
                    合計: {deck.stats.total}
                  </Badge>
                </div>
              </CardContent>

              <CardFooter className="gap-2">
                <Link to={`/deck/${deck.id}`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <BookOpen className="h-4 w-4" />
                    詳細
                  </Button>
                </Link>
                <Link to={`/study/${deck.id}`} className="flex-1">
                  <Button className="w-full gap-2">
                    <Play className="h-4 w-4" />
                    学習
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
