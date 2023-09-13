const { resolve } = require('path')
const { globSync } = require('glob')

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

module.exports = {
  apps,
  appPath
}
