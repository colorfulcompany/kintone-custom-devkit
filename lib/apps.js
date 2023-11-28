const { resolve } = require('path')
const { globSync } = require('glob')
const fs = require('fs')
const YAML = require('yaml')
const { execa } = require('@esm2cjs/execa')

const { readMetainfo } = require('./metainfo.js')

/**
 * @returns {Array}
 */
function apps () {
  return globSync(resolve(__dirname, '../apps/*')).map((e) => e.replace(resolve(__dirname, '../apps/'), '').replace('/', ''))
}

/**
 * @param {string} app
 * @returns {string}
 */
function appPath (app) {
  return resolve(__dirname, '../apps', app)
}


function needBuild (app) {
  const meta = readMetainfo(appPath(app))

  return typeof meta === 'object' && ('build' in meta) && meta.build
}

/**
 * @param {string} app
 * @param {string} mode
 * @returns {Promise<object>}
 */
function buildProcess (app, mode = 'production') {
  const buildOpts = (mode === 'development') ? ['-w'] : []

  return execa(
    'yarn',
    [
      'run', 'vite',
      '-c', resolve(appPath(app), 'vite.config.js'),
      'build', '-m', mode, ...buildOpts
    ],
    {
      stdio: 'inherit',
      env: {
        KINTONE_APP_ID: app,
        KINTONE_BASE_URL: appPath(app)
      }
    }
  )
}

/**
 * @param {string} appId
 * @param {string} srcDir
 * @returns {Promise<object>}
 */
function proxyProcess (appId, srcDir) {
  return execa(
    'yarn',
    ['run', 'proxy'],
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
function descWithProductionId (app) {
  const meta = readMetainfo(appPath(app))
  try {
    return [meta.app_id.production, meta.name].join(':')
  } catch (e) {
    return app
  }
}

module.exports = {
  apps,
  appPath,
  readMetainfo,
  needBuild,
  buildProcess,
  proxyProcess,
  descWithProductionId
}
