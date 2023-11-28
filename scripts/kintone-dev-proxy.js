/**
 * Kintoneのカスタマイズの開発支援proxy
 *
 * **役割**
 *
 * production のカスタマイズコードの取得を block し、development 環境のコードだけが動作するようにする
 *
 * **使い方**
 *
 * <ol>
 *   <li>ブラウザの proxy を local の anyproxy に向ける</li>
 *   <li>development 環境のコードは Kintone のカスタマイズ画面で https://kintone-dev.local/path/to/file のリンクの形式で与える</li>
 *   <li>anyproxy の rule としてこのファイルを与える</li>
 * </ol>
 *
 * **機能**
 *
 * <ol>
 *   <li>環境変数 KINTONE_BASE_URL から該当する Kintone のワークスペースを受け取る</li>
 *   <li>環境変数 KINTONE_APP_ID で proxy 対象とするアプリを受け取る</li>
 *   <li>環境変数 KINTONE_APP_DIR から読み替える local のパスを受け取る</li>
 *   <li>production 環境のカスタマイズ向けの request を block する</li>
 *   <li>development 向けの request を各アプリの場所に合わせて local のファイルの内容に変換する</li>
 * </ol>
 *
 * ※ 環境変数 KINTONE_BASE_URL は @kintone/customize-uploader に合わせてある
 */

const { URL } = require('url')
const path = require('path')
const fs = require('fs')
const { appPath } = require('../lib/apps.js')

/**
 * カスタマイズで添付したファイルの download 用の URL だけ 404 を返し、
 * 開発時に deploy 済みのカスタマイズコードが動作しないようにする
 *
 * カスタマイズ用にアップロードしたファイルは実際にはハッシュ付きの名
 * 前で <script> に与えられて特定不能なので、本proxyルールでは問答無用
 * でblockする
 *
 * @param {object} requestDetail
 * @param {object} responseDetail
 * @returns {object}
 */
async function blockOnlyCustomizeFiles (requestDetail, responseDetail) {
  const u = new URL(requestDetail.url)
  if (u.pathname === '/k/api/js/download.do' &&
      u.searchParams.has('app') &&
      u.searchParams.get('app') === process.env.KINTONE_APP_ID) {
    return {
      response: {
        statusCode: 404,
        header: {
          'Content-Type': 'text/plain',
          'X-ColorfulCompany-Dev-env-error-reason': 'blocked by development proxy'
        }
      }
    }
  } else {
    return {
      response: responseDetail
    }
  }
}

/**
 * customize の mimeType を決定する
 *
 * CSS と JavaScript しか利用できないのでこれで十分
 *
 * @param {string} pathname
 * @returns {string}
 */
function mimeType (pathname) {
  const ext = path.extname(pathname)

  return {
    '.js': 'text/javascript',
    '.ts': 'text/javascript',
    '.css': 'text/css',
    '.scss': 'text/css'
  }[ext]
}

/**
 * kintone-dev.local 向けの customize の request を local から取得して返す
 *
 * @param {object} requestDetail
 * @returns {object} response
 */
async function responseFromLocal (requestDetail) {
  const u = new URL(requestDetail.url)

  return {
    response: {
      statusCode: 200,
      header: {
        'Content-Type': mimeType(u.pathname)
      },
      body: fs.readFileSync(
        path.resolve(
          process.env.KINTONE_APP_DIR,
          u.pathname.replace(/^\//, '')),
        { encoding: 'utf-8' })
    }
  }
}

module.exports = {
  /**
   * @param {object} requestDetail
   * @param {object} responseDetail
   * @returns {object} response
   */
  async beforeSendRequest (requestDetail, responseDetail) {
    const u = new URL(requestDetail.url)

    switch (u.origin) {
    case process.env.KINTONE_BASE_URL:
      return blockOnlyCustomizeFiles(requestDetail, responseDetail)
    case 'https://kintone-dev.local':
      return responseFromLocal(requestDetail)
    }
  }
}
