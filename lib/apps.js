const { resolve } = require('path')
const { globSync } = require('glob')
const fs = require('fs')
const YAML = require('yaml')
const { execa } = require('@esm2cjs/execa')

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

/**
 * @param {string} app
 * @returns {object}
 */
function readMetainfo (app) {
  try {
    const yaml = fs.readFileSync(resolve(appPath(app), 'meta.yml'), { encoding: 'utf-8' })
    return YAML.parse(yaml)
  } catch {
    return {
      build: false
    }
  }
}


function needBuild (app) {
  const meta = readMetainfo(app)

  return meta !== null && ('build' in meta) && meta.build
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
 * @param {string} app
 * @returns {Promise<object>}
 */
function proxyProcess (app) {
  return execa(
    'yarn',
    ['run', 'proxy'],
    {
      stdio: process.env.PROXY_DEBUG === 'true' ? 'inherit' : 'ignore',
      env: {
        KINTONE_APP_ID: app
      }
    }
  )
}

module.exports = {
  apps,
  appPath,
  readMetainfo,
  needBuild,
  buildProcess,
  proxyProcess
}
