// ============================================================
// 設定ページ
// ============================================================
import { SyncPanel } from "@/components/SyncStatus";
import { ExportDialog } from "@/components/ExportDialog";
import { FsrsSettingsPanel } from "@/components/FsrsSettingsPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clearDatabase } from "@/db";

export function SettingsPage() {
  const handleClearData = async () => {
    if (!confirm("全てのデータを削除しますか？この操作は元に戻せません。")) return;
    if (!confirm("本当に削除してよろしいですか？")) return;
    await clearDatabase();
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* FSRS詳細設定 */}
      <FsrsSettingsPanel />

      {/* Google Drive同期 */}
      <SyncPanel />

      {/* データエクスポート */}
      <ExportDialog />

      {/* データ管理 */}
      <Card>
        <CardHeader>
          <CardTitle>データ管理</CardTitle>
          <CardDescription>
            ローカルデータの管理操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleClearData}
            className="gap-2"
          >
            全データを削除
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
