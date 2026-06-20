// ============================================================
// CSVインポートコンポーネント
// ドラッグ＆ドロップ対応、文字コード選択、列設定
// ============================================================
import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { parseCSV, importCSVToDatabase, type CSVParseResult } from "@/lib/csv-parser";
import { cn } from "@/lib/utils";

type ImportStep = "upload" | "config" | "complete";

export function CSVImporter() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [encoding, setEncoding] = useState<"auto" | "utf-8" | "shift-jis">("auto");
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 列設定
  const [idColumn, setIdColumn] = useState<string | undefined>(undefined);
  const [rangeColumn, setRangeColumn] = useState<string | undefined>(undefined);
  const [frontColumns, setFrontColumns] = useState<string[]>([]);
  const [backColumns, setBackColumns] = useState<string[]>([]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("CSVファイルのみ対応しています");
        return;
      }

      setFileName(file.name);
      setIsParsing(true);
      setError(null);

      try {
        const encodingStr = encoding === "auto" ? undefined : encoding;
        const result = await parseCSV(file, encodingStr);
        setParseResult(result);

        // 初期設定：最初の列を表面、残りを裏面
        if (result.columns.length > 0) {
          setFrontColumns([result.columns[0]]);
          setBackColumns(result.columns.slice(1));
        }

        setStep("config");
      } catch (e) {
        setError(e instanceof Error ? e.message : "パースに失敗しました");
      } finally {
        setIsParsing(false);
      }
    },
    [encoding]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const toggleColumn = (
    column: string,
    type: "front" | "back"
  ) => {
    const setter = type === "front" ? setFrontColumns : setBackColumns;
    const current = type === "front" ? frontColumns : backColumns;
    const other = type === "front" ? backColumns : frontColumns;

    if (current.includes(column)) {
      setter(current.filter((c) => c !== column));
    } else {
      setter([...current, column]);
      // 他方から削除
      if (other.includes(column)) {
        if (type === "front") {
          setBackColumns(other.filter((c) => c !== column));
        } else {
          setFrontColumns(other.filter((c) => c !== column));
        }
      }
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    try {
      setIsParsing(true);
      const { deck } = await importCSVToDatabase(fileName, parseResult, {
        frontColumns,
        backColumns,
        idColumn,
        rangeColumn,
      });
      setStep("complete");
      // 3秒後にデッキ詳細へ遷移
      setTimeout(() => navigate(`/deck/${deck.id}`), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "インポートに失敗しました");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">CSVインポート</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: アップロード */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>ファイルをアップロード</CardTitle>
            <CardDescription>
              CSVファイルをドラッグ＆ドロップ、またはクリックして選択
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {isParsing ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    CSVファイルをここにドロップ
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />

            {/* 文字コード選択 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">文字コード:</label>
              <Select
                value={encoding}
                onValueChange={(v) => setEncoding(v as typeof encoding)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自動検出</SelectItem>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="shift-jis">Shift-JIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 列設定 */}
      {step === "config" && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {fileName}
            </CardTitle>
            <CardDescription>
              {parseResult.rowCount}行のデータを検出しました。列の設定を行ってください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ID列・範囲列の設定 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">ID列（一意の識別子）</label>
                <Select
                  value={idColumn ?? ""}
                  onValueChange={(v) => setIdColumn(v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="なし（行番号を使用）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">なし（行番号を使用）</SelectItem>
                    {parseResult.columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">範囲列（ページ等）</label>
                <Select
                  value={rangeColumn ?? ""}
                  onValueChange={(v) => setRangeColumn(v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">なし</SelectItem>
                    {parseResult.columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 表面/裏面の列設定 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">表示列の設定</h3>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">列名</th>
                      <th className="px-3 py-2 text-center font-medium">表面</th>
                      <th className="px-3 py-2 text-center font-medium">裏面</th>
                      <th className="px-3 py-2 text-left font-medium">プレビュー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.columns.map((col) => (
                      <tr key={col} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{col}</td>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={frontColumns.includes(col)}
                            onCheckedChange={() => toggleColumn(col, "front")}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={backColumns.includes(col)}
                            onCheckedChange={() => toggleColumn(col, "back")}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">
                          {parseResult.rows[0]?.[col] ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>
                戻る
              </Button>
              <Button onClick={handleImport} disabled={isParsing} className="gap-2">
                {isParsing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                インポート
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 完了 */}
      {step === "complete" && (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">インポート完了！</h2>
            <p className="text-muted-foreground">デッキ詳細ページに移動します…</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
