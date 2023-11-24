const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * @returns {array}
 */
const metafiles = [
  'meta.yml',
  'meta.yaml',
  'meta.json'
]

/**
 * @returns {object}
 */
const parsers = {
  yml: YAML,
  yaml: YAML,
  json: JSON
}

/**
 * @param {string} file
 * @returns {string}
 */
function suffix (file) {
  return path.extname(file).replace('.', '')
}

/**
 *
 *
 * @param {string} appDir
 * @returns {object}
 */
function readMetainfo (appDir) { // eslint-disable-line no-unused-vars
  let data

  const read = metafiles.some((metafile) => {
    try {
      const content = fs.readFileSync(metafilePath(appDir, metafile), { encoding: 'utf-8' })
      const parser = parsers[suffix(metafile)]

      data = parser.parse(content)

      return true
    } catch (e) {
      return false // console.error(e)
    }
  })

  return read ? data : { build: false }
}

/**
 * @param {string} appDir
 * @param {string} metafile
 * @returns {string}
 */
function metafilePath (appDir, metafile) {
  return path.resolve(appDir, metafile)
}

module.exports = {
  readMetainfo
}
