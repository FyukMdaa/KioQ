// ============================================================
// 学習カードコンポーネント
// 表面→裏面→評価ボタンのフロー
// ============================================================
import { useState, useCallback } from "react";
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
import { upsertCard } from "@/db";
import { cn } from "@/lib/utils";
import type { Card as AppCard, Rating } from "@/types";

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
    label: "Again",
    color: "bg-red-500 hover:bg-red-600",
    className: "text-white",
  },
  Hard: {
    label: "Hard",
    color: "bg-orange-500 hover:bg-orange-600",
    className: "text-white",
  },
  Good: {
    label: "Good",
    color: "bg-green-500 hover:bg-green-600",
    className: "text-white",
  },
  Easy: {
    label: "Easy",
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
  const [previewIntervals, setPreviewIntervals] = useState<
    Record<Rating, { interval: number; label: string }> | null
  >(null);

  const handleFlip = useCallback(() => {
    setIsFlipped(true);
    const intervals = getPreviewIntervals(card);
    setPreviewIntervals(intervals);
  }, [card]);

  const handleRate = useCallback(
    async (rating: Rating) => {
      const result = reviewCard(card, rating);
      await upsertCard({
        ...card,
        fsrs: result.fsrs,
      });
      setIsFlipped(false);
      setPreviewIntervals(null);
      onComplete();
    },
    [card, onComplete]
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="card-flip">
        <div
          className={cn(
            "card-flip-inner relative",
            isFlipped && "flipped"
          )}
          style={{ minHeight: "320px" }}
        >
          {/* 表面 */}
          <div className="card-front absolute inset-0">
            <Card className="flex h-full flex-col">
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
                      <p className="text-2xl font-bold">
                        {card.data[col] ?? ""}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="justify-center">
                <Button
                  onClick={handleFlip}
                  className="gap-2"
                  size="lg"
                >
                  <Eye className="h-4 w-4" />
                  解答を表示
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* 裏面 */}
          <div className="card-back absolute inset-0">
            <Card className="flex h-full flex-col">
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

              <CardContent className="flex-1 space-y-4 py-4">
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
                      <p className="text-lg font-semibold">
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
                        className={cn(
                          "flex flex-col gap-0.5 h-auto py-2",
                          config.color,
                          config.className
                        )}
                        size="sm"
                      >
                        <span className="font-semibold">{config.label}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
