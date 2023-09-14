#! -*- mode: javascript -*-

/**
 * Kintone のカスタマイズコードの development と deploy を担うタスク群
 *
 * アプリの数が増減しても定義を書き換える必要がないように apps/ 以下の
 * ディレクトリを読んで動的にタスクを定義している。
 *
 * Rake に似せた Jake というツールを利用しているが、2023-08 時点でこの
 * Jakefile は CommonJS 形式でしか書けない。これは恐らく元のコードの古
 * さによるもの。
 *
 * また、execa は 2023-08 時点ですでに ESM 形式のパッケージしか提供さ
 * れておらず、また Jake が VM を利用しているおかげで Top-level await
 * が利用できないため、await import() で読み込むこともできない。そのた
 * め、ESM のパッケージを CJS で提供し直してくれるプロジェクトの npm
 * を利用している
 */

const { resolve } = require('path')
const { globSync } =  require('glob')
const { namespace, task, desc } = require('jake')
const { execa } = require('@esm2cjs/execa')
require('dotenv').config()

const { apps, appPath, readMetainfo, needBuild, buildProcess, proxyProcess } = require('./lib/apps.js')

desc('default task')
task('default', () => {
  console.log('default task')
})

desc('apps')
task('apps', () => {
  console.log(apps().join('\n'))
})

desc('lint')
task('lint', () => {
  apps().forEach((e) => {
    console.log(globSync(resolve(__dirname, 'apps', e)))
  })
})

namespace('lint', () => {
  apps().forEach((app) => {
    desc(app)
    task(app, async () => {
      await execa('yarn', ['run', 'eslint', `${appPath(app)}`])
    })
  })
})

namespace('dev', () => {
  apps().forEach((app) => {
    desc(app)
    task(app, async () => {
      const devProccesses = [
        proxyProcess(app)
      ]

      if (needBuild(app)) {
        devProccesses.push(buildProcess(app, 'development'))
      }

      await Promise.all(devProccesses)
    })
  })
})

namespace('build', () => {
  apps().forEach((app) => {
    if (needBuild(app)) {
      desc(app)
      task(app, async () => {
        buildProcess(app)
      })
    }
  })
})

namespace('deploy', () => {
  apps().forEach((app) => {
    const deps = needBuild(app) ? [`build:${app}`] : []

    desc(app)
    task(app, deps, async () => {
      const env = process.env

      await execa(
        'kintone-customize-uploader',
        [
          '--base-url', env.KINTONE_BASE_URL,
          '--username', env.KINTONE_USERNAME,
          '--password', `'${env.KINTONE_PASSWORD}'`,
          '-d', appPath(app),
          `${resolve(appPath(app), 'customize-manifest.json')}`
        ],
        { stdio: 'inherit', cwd: appPath(app) }
      )
    })
  })
})
