// ============================================================
// 学習カードコンポーネント
// 表面→裏面→評価ボタンのフロー
// ============================================================
import { useState, useCallback, useEffect } from "react";
import {
  Eye,
  RotateCcw,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewCard, getPreviewIntervals } from "@/fsrs";
import { upsertCard, getFsrsSettings } from "@/db";
import { cn } from "@/lib/utils";
import type { Card as AppCard, Rating, FsrsSettings } from "@/types";

interface StudyCardProps {
  card: AppCard;
  frontColumns: string[];
  backColumns: string[];
  onComplete: () => void;
}

const ratingConfig: Record<
  Rating,
  { label: string; color: string; className: string }
> = {
  Again: {
    label: "忘れた",
    color: "bg-red-500 hover:bg-red-600",
    className: "text-white",
  },
  Hard: {
    label: "難しい",
    color: "bg-orange-500 hover:bg-orange-600",
    className: "text-white",
  },
  Good: {
    label: "普通",
    color: "bg-green-500 hover:bg-green-600",
    className: "text-white",
  },
  Easy: {
    label: "簡単",
    color: "bg-blue-500 hover:bg-blue-600",
    className: "text-white",
  },
};

export function StudyCard({
  card,
  frontColumns,
  backColumns,
  onComplete,
}: StudyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previewIntervals, setPreviewIntervals] = useState<
    Record<Rating, { interval: number; label: string }> | null
  >(null);
  const [settings, setSettings] = useState<FsrsSettings | undefined>();

  // 設定の読み込み
  useEffect(() => {
    getFsrsSettings().then(setSettings);
  }, []);

  // カードが切り替わったらリセット
  useEffect(() => {
    setIsFlipped(false);
    setIsTransitioning(false);
    setPreviewIntervals(null);
  }, [card.id]);

  const handleFlip = useCallback(() => {
    setIsFlipped(true);
    const intervals = getPreviewIntervals(card, settings);
    setPreviewIntervals(intervals);
  }, [card, settings]);

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (isTransitioning) return;
      setIsTransitioning(true);

      const result = reviewCard(card, rating, settings);
      await upsertCard({
        ...card,
        fsrs: result.fsrs,
      });

      // 少し待ってからカードを切り替える（答えチラ見え防止）
      setTimeout(() => {
        setIsFlipped(false);
        setPreviewIntervals(null);
        setIsTransitioning(false);
        onComplete();
      }, 300);
    },
    [card, onComplete, isTransitioning, settings]
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <div
        className={cn(
          "relative transition-opacity duration-200",
          isTransitioning && "opacity-0"
        )}
      >
        {/* 表面 */}
        {!isFlipped && (
          <Card className="flex flex-col min-h-[60vh]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {card.fsrs.state === "New" ? "新規" : "復習"}
                </Badge>
                {card.rowId && (
                  <span className="text-xs text-muted-foreground">
                    #{card.rowId}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex items-center justify-center py-8">
              <div className="space-y-3 text-center">
                {frontColumns.map((col) => (
                  <div key={col} className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {col}
                    </span>
                    <p className="text-2xl font-bold whitespace-pre-wrap">
                      {card.data[col] ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter className="justify-center">
              <Button
                onClick={handleFlip}
                className="gap-2 w-full h-12"
                size="lg"
              >
                <Eye className="h-4 w-4" />
                解答を表示
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 裏面 */}
        {isFlipped && (
          <Card className="flex flex-col min-h-[60vh]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-xs">
                  解答
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsFlipped(false);
                    setPreviewIntervals(null);
                  }}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  表面に戻る
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 py-4 overflow-y-auto">
              {/* 表面の再表示 */}
              <div className="rounded-md bg-muted/50 p-3">
                {frontColumns.map((col) => (
                  <div key={col} className="text-sm">
                    <span className="text-muted-foreground">{col}: </span>
                    <span className="font-medium">{card.data[col]}</span>
                  </div>
                ))}
              </div>

              {/* 裏面（解答） */}
              <div className="space-y-2">
                {backColumns.map((col) => (
                  <div key={col} className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {col}
                    </span>
                    <p className="text-lg font-semibold whitespace-pre-wrap">
                      {card.data[col] ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter>
              <div className="grid w-full grid-cols-4 gap-2">
                {(Object.keys(ratingConfig) as Rating[]).map((rating) => {
                  const config = ratingConfig[rating];
                  const preview = previewIntervals?.[rating];
                  return (
                    <Button
                      key={rating}
                      onClick={() => handleRate(rating)}
                      disabled={isTransitioning}
                      className={cn(
                        "flex flex-col gap-0.5 h-auto py-2 px-1",
                        config.color,
                        config.className
                      )}
                      size="sm"
                    >
                      <span className="font-semibold text-xs">{config.label}</span>
                      {preview && (
                        <span className="text-[10px] opacity-80 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {preview.label}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
