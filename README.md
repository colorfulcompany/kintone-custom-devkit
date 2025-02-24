# Kintone Custom Devkit

## できること

 * 指定ディレクトリ以下のアプリの一覧を自動生成
 * それぞれの app ごとのタスクを自動定義
    * lint ( 予定 )
    * deploy
    * proxy
    * build ( opt-in )
    * test ( 予定 )

## 特徴

 * 複数のアプリのカスタマイズコードを効率的に集中管理しやすい
 * 開発中のコードを deploy することなく Kintone 環境に適用するための development proxy を持っており、運用を妨げず、かつ小さいサイクルでの開発を容易にする

## 準備

### 0. アプリを管理できるアカウント

開発する対象のアプリの管理権限のあるアカウントの username, password を取得しておくこと。つまり SSO でしかログインできないアカウントでは本ツールは利用できないので注意。

ただし**本ツールを利用して deploy しない場合は不要**。

Kintone の権限管理にはさまざまな方法があり、OAuth でも `@kintone/customize-uploader` は利用できるが、開発時、各種 API を叩く必要が出た場合など

**Kintoneの開発時の利用については結局パスワード認証が最強**

なので、SSO環境の場合は管理者と相談しパスワード認証を有効にしてもらう。

### 1. Jakefile

本ツールは Kintone カスタマイズの開発を助けるタスクを自動定義するために

[jakejs/jake: JavaScript build tool, similar to Make or Rake\. Built to work with Node\.js\.](https://github.com/jakejs/jake)

を利用している。Jake を適切に動作させるために以下のような内容の Jakefile をプロジェクトルートに置く必要がある。

```javascript
const { resolve } = require('path')
const { defineDevkitTasks } = require('@colorfulcompany/kintone-custom-devkit/jakelib/builder')
defineDevkitTasks(resolve(__dirname, 'apps'))
```

上記の Jakefile はプロジェクト全体で以下のようなディレクトリ構成になっていることを期待している。

```
プロジェクトルート/
  Jakefile
  apps/
    アプリ1/  <- アプリごとのカスタマイズコード
    アプリ2/  <- アプリごとのカスタマイズコード
    ...
```

注意事項として、**Jakefile は v10 の時点で CommonJS 形式でしか動作しない**。

### 2. 環境変数

`.env` ファイルを用意し、以下の環境変数をセット

 * `KINTONE_BASE_URL`
 * `KINTONE_USERNAME`
 * `KINTONE_PASSWORD`

直接 deploy しない場合は `KINTONE_USERNAME`, `KINTONE_PASSWORD` は不要

下記の Kintone Dev Proxy を利用する場合は

 * `PROXY_DEBUG` を true に

すると anyproxy およびそこから読み込むカスタムスクリプトのログが表示される。

### 3. deploy用のツールを別途global install

これも**本ツールで直接 deploy しない場合は不要**。

[@kintone/customize\-uploader \- npm](https://www.npmjs.com/package/@kintone/customize-uploader)

**@kintone/customize-uploader を global install してください**。

このツールは `@kintone/customize-uploader` を利用しているが、`@kintone/customize-uploader` は project 以下にインストールすると cwd の計算がどうしても project root になってしまう。この影響で customize manifest ファイルに含まれるパスも project root 以下からのものにせざるを得ない。

例えば以下のようにカスタマイズのコードを置いたとして

```
<指定ディレクトリ>/ <- カスタマイズするアプリを置く場所
  アプリ1/
  アプリ2/
  ...
```

アプリ1の manifest は以下のファイルになるが、

`<指定ディレクトリ>/アプリ1/customize-manifest.json`

この内容は以下のようになる。

```json
{
  "app": "アプリ1", <- 実際にはID(数字)
  "scope": "ALL",
  "desktop": {
    "js": [
      "<指定ディレクトリ>/アプリ1/desktop/js/foobar.js", // <-
      ..
    ]
  }
}
```

これでは実際のディレクトリ構成と manifest ファイル内に二重に情報が保存されてしまって扱いにくいが、global install した場合はこのような問題は起きないので、global install で解決することとした。

### 4. ブラウザのproxyのセットアップ

development proxy として [alibaba/anyproxy: A fully configurable http/https proxy in NodeJS](https://github.com/alibaba/anyproxy) を利用している。開発中は Kintone の workspace への request を local proxy に向けることで開発中のコードを deploy することなく Kintone 環境に適用できる。

そのためブラウザの proxy 設定で

`KINTONE_BASE_URL` -> `localhost:8001`[^1]

へ向ける設定を行う。開発時には頻繁にこの設定を ON/OFF することになるので、何らかのブラウザ拡張の利用を推奨する。

[^1]: localhost:8001 は anyproxy のデフォルト

## 開発手法

### buildプロセスがあるもの

`<指定ディレクトリ>/<name>/` 以下に `meta.yaml` を置き、その中で

```yaml
build: true
```

と設定する。build プロセスの実行には `vite` を利用する。

#### 具体的なディレクトリ構成とvite.config.jsの例

例えば

```
<指定ディレクトリ>/
  アプリ1/ <- ここでビルドが必要な場合
  アプリ2/
  ...
```

の場合、以下のような構成になる。

```
<指定ディレクトリ>/
  アプリ1/ <- ここでビルドが必要な場合
    desktop/  <- PC用のコード（deploy用）
    meta.yaml <- build: true
    mobile/   <- モバイル用のコード（deploy用）
    src/      <- 開発中のコード
      index.html
      js/
    vite.config.js
```

例えば Vue2 を利用している場合の vite.config.js は以下のようになる。

```javascript
import path from 'path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue2'

const root = path.resolve(__dirname, './src')

export default defineConfig (({ command, mode }) => {
  const isProduction = mode === 'production'

  return {
    root,
    plugins: [
      Vue()
    ],
    build: {
      outDir: '..',
      modulePreload: false,
      minify: isProduction,
      rollupOptions: {
        output: {
          format: 'iife',
          entryFileNames: '[name].js',
          assetFileNames: '[name].js'
        },
        input: {
          'desktop/js/app': path.resolve(root, 'index.html')
        }
      }
    }
  }
})
```

Kintone カスタマイズのコードは以下のように type="module" ではない形で読み込まれる[^2]ので、

```
<script src="https://<KINTONE_BASE_URL>/k/api/js/download.do?app=xxx..."></script>
```

Vite でビルドする際には **「ESM でない形式」で出力する必要がある**。上記の例では IIFE で出力している。

[^2]: これはカスタマイズのコードの互換性と、アプリそのものの情報へのアクセスしやすさを考えると恐らくそう簡単に変わらない

### buildプロセスがないもの

カスタマイズに適用する構成をそのまま local に置く。

## meta.yamlの文法

```yaml
name: <アプリの名前> ( not ID )
app_id:
  production: 本運用中のアプリケーションID
  staging: 動作確認に利用するアプリケーションID
build: boolean
```

app_id は Kintone Dev Proxy で利用する。ここに書かれた環境ごとに jake -T でタスクが並び、例えば

```
jake applyLocal:<アプリ名>:production
```

なら production のアプリケーションIDに対して proxy が有効になる。deploy の際は customize-manifest.json に書かれている ID を利用しているので、deploy のために meta.yaml を書かなければいけないわけではない。

## Kintone Dev Proxyについて

### 目的

開発環境のコードのみをカスタマイズとして適用する。

 * production の attachment の読み込みを block （強制 404）
 * 開発用に追加した URL `https://kintone-dev.local` 以下は local のファイルを読み込む

これによって他のユーザーの環境に影響を与えずに開発者だけ開発途中のカスタマイズのコードを利用できる。

### 使い方

 1. 該当アプリの dev タスクを起動する
 2. ブラウザの proxy 設定で Kintone のワークススペースの URL への request を local proxy ( localhost:8001 ) へ向ける
 3. 開発中で適用したいコードがある場合は `https://kintone-dev.local` 以下の URL として該当アプリに追加

3 の URL は local の deploy に利用するファイルを参照するので、例えば

`https://kintone-dev.local/desktop/js/foobar.js`

をリンクとして「アプリ1」に追加した場合は、

```
<指定ディレクトリ>/
  アプリ1/
    desktop/
      js/
        foobar.js
  アプリ2/
  ...
```

のような位置に適用したいファイルを置く。

### 構成

```mermaid
graph
  dev((Developer))
  subgraph browser
    proxy_config(e.g. SmartProxy)
  end

  subgraph anyproxy
    script
  end

  subgraph domain
    attachment
    URL
  end
  local

  browser --> anyproxy
  anyproxy -. block .- attachment
  anyproxy -. replace .- URL
  script --> local

  dev --> browser
  dev --> local

  style attachment color: #666,stroke: #999,stroke-dasharray: 3 3
  style URL stroke-width: 3px
  style local stroke-width: 3px
```

### 依存

 * [alibaba/anyproxy: A fully configurable http/https proxy in NodeJS](https://github.com/alibaba/anyproxy)
