// ============================================================
// 同期ステータスコンポーネント
// Google Drive同期のUI
// ============================================================
import { useState } from "react";
import {
  Cloud,
  CloudOff,
  Loader2,
  Check,
  AlertTriangle,
  Upload,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sync,
  syncUpstream,
  syncDownstream,
  authenticate,
  signOut,
} from "@/lib/google-drive";
import type { SyncStatus as SyncStatusType, ConflictResolution } from "@/types";

export function SyncPanel() {
  const [status, setStatus] = useState<SyncStatusType>("idle");
  const [conflictResolution, setConflictResolution] =
    useState<ConflictResolution>("newest");
  const [clientId, setClientId] = useState("");
  const [isAuth, setIsAuth] = useState(false);

  const handleAuth = async () => {
    if (!clientId) {
      alert("Google OAuth2クライアントIDを入力してください");
      return;
    }
    try {
      setStatus("syncing");
      await authenticate(clientId);
      setIsAuth(true);
      setStatus("idle");
    } catch (e) {
      console.error("認証エラー:", e);
      setStatus("error");
    }
  };

  const handleSync = async () => {
    if (!clientId) return;
    setStatus("syncing");
    try {
      const result = await sync(clientId, conflictResolution);
      setStatus(result);
    } catch {
      setStatus("error");
    }
  };

  const handleUpload = async () => {
    if (!clientId) return;
    setStatus("syncing");
    try {
      const result = await syncUpstream(clientId);
      setStatus(result);
    } catch {
      setStatus("error");
    }
  };

  const handleDownload = async () => {
    if (!clientId) return;
    setStatus("syncing");
    try {
      const result = await syncDownstream(clientId, conflictResolution);
      setStatus(result);
    } catch {
      setStatus("error");
    }
  };

  const handleSignOut = () => {
    signOut();
    setIsAuth(false);
    setStatus("idle");
  };

  const statusIcon = {
    idle: <Cloud className="h-5 w-5 text-muted-foreground" />,
    syncing: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
    success: <Check className="h-5 w-5 text-green-500" />,
    error: <AlertTriangle className="h-5 w-5 text-destructive" />,
    conflict: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  };

  const statusText = {
    idle: "待機中",
    syncing: "同期中...",
    success: "同期完了",
    error: "同期エラー",
    conflict: "競合検出",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Google Drive 同期
        </CardTitle>
        <CardDescription>
          学習データをGoogle Drive（アプリ専用領域）にバックアップ・同期します。
          ユーザーの他のファイルにはアクセスしません。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* クライアントID入力 */}
        {!isAuth && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Google OAuth2 クライアントID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Google Cloud Consoleで取得したクライアントIDを入力してください。
              drive.appdataスコープを使用します。
            </p>
          </div>
        )}

        {/* ステータス表示 */}
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
          {statusIcon[status]}
          <span className="text-sm font-medium">{statusText[status]}</span>
        </div>

        {/* コンフリクト解決方法 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">競合時の解決方法</label>
          <Select
            value={conflictResolution}
            onValueChange={(v) => setConflictResolution(v as ConflictResolution)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新日時優先（推奨）</SelectItem>
              <SelectItem value="cloud">クラウド優先</SelectItem>
              <SelectItem value="local">ローカル優先</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ボタン */}
        <div className="flex flex-col gap-2">
          {!isAuth ? (
            <Button onClick={handleAuth} className="gap-2">
              <Cloud className="h-4 w-4" />
              Googleアカウントでサインイン
            </Button>
          ) : (
            <>
              <Button onClick={handleSync} disabled={status === "syncing"} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                双方向同期
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleUpload}
                  disabled={status === "syncing"}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  アップロード
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={status === "syncing"}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  ダウンロード
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="gap-2 text-muted-foreground"
              >
                <CloudOff className="h-4 w-4" />
                サインアウト
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
