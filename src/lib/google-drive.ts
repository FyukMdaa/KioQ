// ============================================================
// KioQ Google Drive 同期機能
// drive.appdata スコープを使用した安全な同期
// ============================================================
import type { SyncData, ConflictResolution, SyncStatus } from "@/types";
import { exportAllData, importAllData } from "@/db";

const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const SYNC_FILENAME = "kioq_sync.json";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

/** Google APIをロード */
function loadGapi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gapiLoaded) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      gapi.load("client", async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiLoaded = true;
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** Google Identity Servicesをロード */
function loadGIS(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gisLoaded) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: () => {}, // 後で上書き
      });
      gisLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Google認証を実行してアクセストークンを取得
 * @paramClientId Google CloudのOAuth2クライアントID
 */
export async function authenticate(
  clientId: string
): Promise<string> {
  await loadGapi();
  await loadGIS(clientId);

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Token client not initialized"));
      return;
    }

    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      resolve(gapi.client.getToken()?.access_token ?? "");
    };

    // 既にトークンがある場合はリフレッシュ
    const token = gapi.client.getToken();
    if (token && token.access_token) {
      tokenClient.requestAccessToken({ prompt: "" });
    } else {
      tokenClient.requestAccessToken({ prompt: "consent" });
    }
  });
}

/** 認証済みかどうかを確認 */
export function isAuthenticated(): boolean {
  if (!gapiLoaded) return false;
  const token = gapi.client.getToken();
  return !!token && !!token.access_token;
}

/** アプリデータフォルダ内の同期ファイルを検索 */
async function findSyncFile(): Promise<string | null> {
  try {
    const response = await gapi.client.drive.files.list({
      spaces: "appDataFolder",
      q: `name='${SYNC_FILENAME}'`,
      fields: "files(id, modifiedTime)",
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

/** 同期ファイルのメタデータを取得 */
async function getSyncFileMetadata(): Promise<{
  id: string;
  modifiedTime: string;
} | null> {
  try {
    const fileId = await findSyncFile();
    if (!fileId) return null;

    const response = await gapi.client.drive.files.get({
      fileId,
      fields: "id, modifiedTime",
    });
    return response.result;
  } catch {
    return null;
  }
}

/** Google Driveにデータをアップロード */
async function uploadToDrive(data: SyncData): Promise<void> {
  const fileId = await findSyncFile();
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });

  const metadata = {
    name: SYNC_FILENAME,
    mimeType: "application/json",
  };

  if (fileId) {
    // 既存ファイルを更新
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("media", blob);

    const accessToken = gapi.client.getToken()?.access_token;
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
      {
        method: "PATCH",
        headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
        body: form,
      }
    );
  } else {
    // 新規作成（appDataFolderに配置）
    const form = new FormData();
    form.append(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            ...metadata,
            parents: ["appDataFolder"],
          }),
        ],
        { type: "application/json" }
      )
    );
    form.append("media", blob);

    const accessToken = gapi.client.getToken()?.access_token;
    await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
        body: form,
      }
    );
  }
}

/** Google Driveからデータをダウンロード */
async function downloadFromDrive(): Promise<SyncData | null> {
  const fileId = await findSyncFile();
  if (!fileId) return null;

  try {
    const response = await gapi.client.drive.files.get({
      fileId,
      alt: "media",
    });
    return response.result as SyncData;
  } catch {
    return null;
  }
}

/**
 * アップストリーム同期（ローカル → Google Drive）
 */
export async function syncUpstream(
  clientId: string
): Promise<SyncStatus> {
  try {
    if (!isAuthenticated()) {
      await authenticate(clientId);
    }

    const localData = await exportAllData();
    const syncData: SyncData = {
      decks: localData.decks,
      cards: localData.cards,
      updatedAt: Date.now(),
    };

    await uploadToDrive(syncData);
    return "success";
  } catch (e) {
    console.error("Upstream sync error:", e);
    return "error";
  }
}

/**
 * ダウンストリーム同期（Google Drive → ローカル）
 * @param clientId Google OAuth2クライアントID
 * @param conflictResolution コンフリクト時の解決方法
 */
export async function syncDownstream(
  clientId: string,
  conflictResolution: ConflictResolution = "newest"
): Promise<SyncStatus> {
  try {
    if (!isAuthenticated()) {
      await authenticate(clientId);
    }

    const cloudData = await downloadFromDrive();
    if (!cloudData) return "success"; // クラウドにデータなし

    const localData = await exportAllData();

    // コンフリクト検出
    const localUpdated = Math.max(
      ...localData.decks.map((d) => d.updatedAt),
      0
    );
    const cloudUpdated = cloudData.updatedAt;

    if (localUpdated > 0 && cloudUpdated > localUpdated + 60000) {
      // 1分以上の差がある場合、コンフリクトとみなす
      if (conflictResolution === "local") return "success";
      if (conflictResolution === "newest" && localUpdated > cloudUpdated) {
        return "success";
      }
      // cloud または newest でクラウドが新しい場合
    }

    await importAllData({ decks: cloudData.decks, cards: cloudData.cards });
    return "success";
  } catch (e) {
    console.error("Downstream sync error:", e);
    return "error";
  }
}

/**
 * 双方向同期のメインエントリポイント
 */
export async function sync(
  clientId: string,
  conflictResolution: ConflictResolution = "newest"
): Promise<SyncStatus> {
  try {
    if (!isAuthenticated()) {
      await authenticate(clientId);
    }

    // クラウドのデータを確認
    const cloudMeta = await getSyncFileMetadata();
    const localData = await exportAllData();
    const localUpdated = Math.max(
      ...localData.decks.map((d) => d.updatedAt),
      0
    );

    if (!cloudMeta) {
      // クラウドにデータがない → アップロード
      return syncUpstream(clientId);
    }

    const cloudUpdated = new Date(cloudMeta.modifiedTime).getTime();

    if (conflictResolution === "newest") {
      if (localUpdated > cloudUpdated) {
        return syncUpstream(clientId);
      } else {
        return syncDownstream(clientId, conflictResolution);
      }
    } else if (conflictResolution === "cloud") {
      return syncDownstream(clientId, conflictResolution);
    } else {
      return syncUpstream(clientId);
    }
  } catch (e) {
    console.error("Sync error:", e);
    return "error";
  }
}

/** サインアウト */
export function signOut(): void {
  const token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken(null);
  }
}
