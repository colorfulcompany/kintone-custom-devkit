const { resolve } = require('path')
const { globSync } = require('glob')
const fs = require('fs')
const { execa } = require('@esm2cjs/execa')

const { readMetainfo } = require('./metainfo.js')

class KintoneApps {
  /**
   * @param {string} appDir
   */
  constructor (appDir) {
    this.appDir = appDir

    fs.access(appDir, fs.constants.F_OK, (err) => {
      if (err) {
        console.error('`appDir\' not exist.')
        throw err
      }
    })
  }

  /**
   * @param {string} appDir
   * @returns {Array}
   */
  list () {
    return globSync(`${this.appDir}/*`).map((e) => {
      return e.replace(`${this.appDir}/`, '').replace('/', '')
    })
  }

  /**
   * @param {string} app
   * @returns {string}
   */
  path (app) {
    return resolve(this.appDir, app)
  }
}


/**
 * @param {KintoneApps} apps
 * @param {string} app - application name
 * @returns {boolean}
 */
function needBuild (apps, app) {
  const meta = readMetainfo(apps.path(app))

  return typeof meta === 'object' && ('build' in meta) && meta.build
}

/**
 * @param {KintoneApps} apps
 * @param {string} app - application name
 * @returns {string}
 */
function resolveViteConfig (apps, app) {
  return resolve(apps.path(app), 'vite.config.js')
}

/**
 * @param {KintoneApps} apps
 * @param {string} app
 * @param {string} mode
 * @returns {Promise<object>}
 */
async function buildProcess (apps, app, mode = 'production') {
  const buildOpts = (mode === 'development') ? ['-w'] : []

  return execa(
    'yarn',
    [
      'run', 'vite',
      '-c', resolveViteConfig(apps, app),
      'build', '-m', mode, ...buildOpts
    ],
    {
      stdio: 'inherit',
      env: {
        KINTONE_APP_ID: app,
        KINTONE_BASE_URL: apps.path(app)
      }
    }
  )
}

/**
 * @param {KintoneApps} apps
 * @param {string} app - application name
 * @returns {Promise<object>}
 */
async function devProcess (apps, app) {
  return execa(
    'yarn',
    [
      'run', 'vite',
      '-c', resolveViteConfig(apps, app)
    ],
    {
      stdio: 'inherit'
    }
  )
}

/**
 * @param {string} appId
 * @param {string} srcDir
 * @returns {Promise<object>}
 */
async function proxyProcess (appId, srcDir) {
  return execa(
    'yarn',
    ['run', 'anyproxy', '-i', '-r', resolve(__dirname, '../scripts/kintone-dev-proxy.js')],
    {
      stdio: process.env.PROXY_DEBUG === 'true' ? 'inherit' : 'ignore',
      env: {
        KINTONE_APP_ID: appId,
        KINTONE_APP_DIR: srcDir
      }
    }
  )
}

/**
 * @param {string} app
 * @returns {string}
 */
function descWithProductionId (apps, app) {
  const meta = readMetainfo(apps.path(app))
  try {
    return [meta.app_id.production, meta.name].join(':')
  } catch (e) {
    return app
  }
}

module.exports = {
  KintoneApps,
  needBuild,
  buildProcess,
  devProcess,
  proxyProcess,
  descWithProductionId
}
