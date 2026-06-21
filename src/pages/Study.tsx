// ============================================================
// 学習ページ
// レビューキューからカードを出題
// ============================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  BookX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/StudyCard";
import { getDeckById, getReviewCards, getFsrsSettings } from "@/db";
import type { Card, Deck, CustomStudyConfig } from "@/types";

export function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  // クエリパラメータからカスタム学習かどうかを判定
  const isCustom = new URLSearchParams(location.search).get("custom") === "true";

  const loadReviewQueue = useCallback(async () => {
    if (!deckId) return;
    try {
      const d = await getDeckById(deckId);
      if (!d) return;
      setDeck(d);

      let customConfig: CustomStudyConfig | undefined;
      if (isCustom) {
        const saved = sessionStorage.getItem(`custom_study_${deckId}`);
        if (saved) {
          customConfig = JSON.parse(saved);
        }
      }

      const settings = await getFsrsSettings();
      const reviewCards = await getReviewCards(d.id, { 
        settings, 
        customStudy: customConfig 
      });
      
      setReviewQueue(reviewCards);
      setCurrentIndex(0);
      setCompleted(reviewCards.length === 0);
    } finally {
      setLoading(false);
    }
  }, [deckId, isCustom]);

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

  // Ankiスタイルの枚数表示（残りの枚数）
  const stats = useMemo(() => {
    const remaining = reviewQueue.slice(currentIndex);
    return {
      new: remaining.filter(c => c.fsrs.state === "New").length,
      learn: remaining.filter(c => c.fsrs.state === "Learning" || c.fsrs.state === "Relearning").length,
      due: remaining.filter(c => c.fsrs.state === "Review").length,
    };
  }, [reviewQueue, currentIndex]);

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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate max-w-[150px] sm:max-w-none">{deck.name}</h1>
            {isCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">カスタム</span>
            )}
          </div>
          <div className="flex gap-2 mt-0.5">
            <span className="text-[11px] font-bold text-blue-500">{stats.new}</span>
            <span className="text-[11px] font-bold text-orange-500">{stats.learn}</span>
            <span className="text-[11px] font-bold text-green-500">{stats.due}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground font-medium">
            {currentIndex + 1} / {reviewQueue.length}
          </p>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-1.5 bg-primary transition-all duration-300"
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
