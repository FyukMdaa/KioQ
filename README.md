# KioQ - FSRS反復学習アプリ

FSRS（Free Spaced Repetition Scheduler）アルゴリズムを用いた、高機能かつ柔軟な反復学習用PWAアプリケーション。

## 特徴

- **FSRSアルゴリズム**: 科学的根拠に基づく最適な間隔反復スケジューリング
- **CSVインポート**: ドラッグ＆ドロップでCSVファイルを読み込み（UTF-8 / Shift-JIS対応）
- **カスタム出題**: 表面/裏面に表示する列を選択、範囲フィルターで出題対象を限定
- **Google Drive同期**: アプリ専用領域（drive.appdata）を使用した安全なバックアップ・同期
- **PWA対応**: オフラインで利用可能、ホーム画面に追加可能
- **ローカルファースト**: データはすべてIndexedDBに保存

## 技術スタック

- **Language:** TypeScript
- **Frontend:** Vite + React 18
- **Styling:** Tailwind CSS + Shadcn UI（Radix UI）
- **Database:** Dexie.js (IndexedDBラッパー)
- **FSRS Engine:** ts-fsrs
- **CSV Parser:** PapaParse
- **Google API:** gapi / Google Identity Services
- **PWA:** vite-plugin-pwa (Workbox)

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## Google Drive同期の設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth 2.0クライアントIDを作成（ウェブアプリケーション）
3. 承認済みのJavaScript生成元にアプリのURLを追加
4. 設定ページでクライアントIDを入力

> **安全性**: drive.appdataスコープを使用するため、アプリはユーザーの他のGoogle Driveファイルにアクセスしません。

## プロジェクト構成

```
kioq/
├── public/icons/          # PWAアイコン
├── src/
│   ├── components/        # UIコンポーネント
│   │   ├── ui/            # Shadcn UIベースコンポーネント
│   │   ├── Layout.tsx     # レイアウト
│   │   ├── DeckList.tsx   # デッキ一覧
│   │   ├── CSVImporter.tsx # CSVインポート
│   │   ├── StudyCard.tsx  # 学習カード
│   │   ├── DeckConfig.tsx # デッキ設定
│   │   ├── SyncStatus.tsx # 同期パネル
│   │   └── ExportDialog.tsx # エクスポート
│   ├── db/                # Dexie.jsデータベース
│   ├── fsrs/              # FSRSエンジンラッパー
│   ├── lib/               # ユーティリティ
│   │   ├── csv-parser.ts  # CSVパーサー
│   │   ├── google-drive.ts # Google Drive同期
│   │   └── utils.ts       # 共通ユーティリティ
│   ├── pages/             # ページコンポーネント
│   ├── types/             # 型定義
│   ├── App.tsx            # アプリルート
│   ├── main.tsx           # エントリーポイント
│   └── index.css          # グローバルスタイル
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## データ構造

### decks（デッキメタ情報）
| フィールド | 型 | 説明 |
|---|---|---|
| id | String (UUID) | デッキの一意な識別子 |
| name | String | デッキ名 |
| columns | String[] | CSV列名リスト |
| config | Object | 表示設定・フィルター設定 |
| updatedAt | Number | 最終更新日時 |

### cards（カードデータ＆FSRSステータス）
| フィールド | 型 | 説明 |
|---|---|---|
| id | String (UUID) | カードの一意な識別子 |
| deckId | String | 所属デッキID |
| rowId | String | 行識別子 |
| data | Object | CSVの1行データ |
| fsrs | Object | FSRSパラメータ |

## ライセンス

MIT
