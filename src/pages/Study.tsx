// ============================================================
// 学習ページ
// レビューキューからカードを出題
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  BookX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { getDeckById, getReviewCards } from "@/db";
import type { Card, Deck } from "@/types";

export function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  const loadReviewQueue = useCallback(async () => {
    if (!deckId) return;
    try {
      const d = await getDeckById(deckId);
      if (!d) return;
      setDeck(d);

      const reviewCards = await getReviewCards(d.id);
      setReviewQueue(reviewCards);
      setCurrentIndex(0);
      setCompleted(reviewCards.length === 0);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  const handleCardComplete = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= reviewQueue.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, reviewQueue.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <BookX className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">デッキが見つかりません</p>
        <Link to="/">
          <Button variant="outline">ホームに戻る</Button>
        </Link>
      </div>
    );
  }

  if (completed || reviewQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">本日の学習完了！</h2>
        <p className="text-muted-foreground">
          {reviewQueue.length === 0
            ? "現在復習すべきカードはありません"
            : `${reviewQueue.length}枚のカードを復習しました`}
        </p>
        <div className="flex gap-3">
          <Link to={`/deck/${deck.id}`}>
            <Button variant="outline">デッキ詳細</Button>
          </Link>
          <Link to="/">
            <Button>ホームに戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = reviewQueue[currentIndex];

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link to={`/deck/${deck.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{deck.name}</h1>
          <p className="text-xs text-muted-foreground">
            {currentIndex + 1} / {reviewQueue.length} 枚
          </p>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="h-1.5 rounded-full bg-secondary">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{
            width: `${((currentIndex + 1) / reviewQueue.length) * 100}%`,
          }}
        />
      </div>

      {/* 学習カード */}
      <StudyCard
        card={currentCard}
        frontColumns={deck.config.frontColumns}
        backColumns={deck.config.backColumns}
        onComplete={handleCardComplete}
      />
    </div>
  );
}
