<div align="center">

<img src="build/icon.png" width="120" height="120" alt="Choyeon To Do Logo" />

# Choyeon To Do

**シンプルで使いやすいタスク管理ツール**

<p align="center">
  <a href="#機能">機能</a> ·
  <a href="#ダウンロード">ダウンロード</a> ·
  <a href="#オンラインで試す">オンラインで試す</a> ·
  <a href="#スクリーンショット">スクリーンショット</a> ·
  <a href="#使い方">使い方</a> ·
  <a href="#開発">開発</a>
</p>

[![Release](https://img.shields.io/github/v/release/Choyeon/choyeon-todo?style=flat-square&logo=github&label=Release)](https://github.com/Choyeon/choyeon-todo/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Web-0078D4?style=flat-square&logo=windows-terminal&logoColor=white)](#ダウンロード)
[![Web Demo](https://img.shields.io/badge/demo-online-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://chuyuchoyeon.github.io/choyeon-todo/)
[![License](https://img.shields.io/github/license/Choyeon/choyeon-todo?style=flat-square)](./LICENSE)

[English](README.md) · [中文](README.zh-CN.md)

</div>

---

## 機能

- **クイック追加** — 入力してエンターキーを押すだけ。日付、時間、優先度を自動検出
- **カレンダー** — 月ビューとタイムラインで予定を確認。ドラッグで日程変更
- **ポモドーロ** — 集中 + 休憩のサイクル。任意のタスクにタイマーを設定
- **統計** — 完了タスク数、集中時間、連続記録などを確認
- **ライト & ダークテーマ** — システム設定に合わせるか、手動で切り替え
- **クロスプラットフォーム** — Windows、macOS、Web で同じ使い心地
- **キーボードショートカット** — マウスを使わずに操作
- **PWA対応** — Web版をデスクトップにインストールしてオフラインでも使用可
- **多言語** — 简体中文 · English · 日本語

---

## スクリーンショット

| メイン画面 | カレンダー |
| :---: | :---: |
| <img src="img/main.png" width="100%" alt="メイン画面" /> | <img src="img/🗓.png" width="100%" alt="カレンダー" /> |
| **統計** | **ポモドーロ** |
| <img src="img/data.png" width="100%" alt="統計" /> | <img src="img/potato.png" width="100%" alt="ポモドーロ" /> |

---

## オンラインで試す

Web版はこちらから：

**🌐 https://chuyuchoyeon.github.io/choyeon-todo/**

> Web版にはシステム通知、トレイメニュー、グローバルショートカットなどのデスクトップ機能はありません。

---

## ダウンロード

### 最新バージョン：v1.0.1

| プラットフォーム | ダウンロード |
|------------------|--------------|
| **Windows** | [セットアップ版](https://github.com/Choyeon/choyeon-todo/releases/latest) · [ポータブル版](https://github.com/Choyeon/choyeon-todo/releases/latest) |
| **macOS** | [DMG / ZIP](https://github.com/Choyeon/choyeon-todo/releases/latest)（Intel & Apple Silicon） |
| **Linux** | [tar.gz](https://github.com/Choyeon/choyeon-todo/releases/latest) |

すべてのダウンロードは [Releases ページ](https://github.com/Choyeon/choyeon-todo/releases) にあります。

### インストール方法

**Windows**
- セットアップ版：インストーラーを実行して画面に従ってください
- ポータブル版：解凍して `Choyeon To Do.exe` を直接実行

**macOS**
- DMGを開いて、アプリをApplicationsフォルダにドラッグ
- セキュリティの警告が出た場合は、システム設定 → プライバシーとセキュリティ で「このまま開く」をクリック

---

## 使い方

### 基本的な使い方

1. **タスクを追加** — 上の入力欄に文字を入力してエンターキー
2. **自動検出** — 日付、時間、優先度、カテゴリが自動で認識されます
   - 例：`明日の午後3時 会議 #仕事 重要`
3. **タスク管理** — チェックボックスで完了、テキストをクリックで編集
4. **ビュー切り替え** — 左のサイドバーで画面を切り替え

### キーボードショートカット

| ショートカット | 機能 |
|----------------|------|
| `Ctrl/Cmd + N` | 新規タスク |
| `Ctrl/Cmd + F` | タスクを検索 |
| `Ctrl/Cmd + ,` | 設定を開く |
| `Esc` | ダイアログを閉じる / 編集をキャンセル |

---

## 開発

### 必要環境

- Node.js >= 18
- npm >= 9

### 開発を始める

```bash
# リポジトリをクローン
git clone https://github.com/Choyeon/choyeon-todo.git
cd choyeon-todo

# 依存関係をインストール
npm install

# Web版で開発
npm run dev

# デスクトップ版で開発
npm run electron:dev
```

### ビルド

```bash
# Web版をビルド
npm run build

# Windows版をビルド（Windows上で実行）
npm run electron:build:win

# macOS版をビルド（macOS上で実行）
npm run electron:build:mac

# Linux版をビルド
npm run electron:build:linux
```

ビルド成果物は `app-build/` ディレクトリに出力されます。

### テスト

```bash
# ユニットテストを実行
npm run test:run

# カバレッジ
npm run test:coverage
```

### 使用技術

Vue 3 · Vite · Pinia · Vue Router · Electron · electron-builder · Vitest · Lucide Icons · vue-i18n · vite-plugin-pwa

---

## 更新履歴

### v1.0.1 — 2026-07-18

- READMEの構成を調整、アプリ自体の紹介に集中
- Aboutページの文言を調整
- 修正：Windowsビルドのパスの問題
- 修正：完了タスクのスタイルのビュー間の不整合

### v1.0.0 — 2026-07-18

初回リリース。

主な機能：
- スマートタスク入力（自然言語解析）
- カレンダー（月ビュー + タイムライン）
- ポモドーロタイマー（3モード + フルスクリーン集中）
- 統計（折れ線グラフ、円グラフ、ヒートマップ、棒グラフ）
- システム通知とリマインダー
- ライト / ダークテーマ
- PWAオフライン対応
- 3言語：简体中文 / English / 日本語

---

## ライセンス

[MIT](./LICENSE) © Choyeon
