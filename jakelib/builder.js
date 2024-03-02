/**
 * Kintone のカスタマイズコードの development と deploy を担うタスク群
 *
 * アプリの数が増減しても定義を書き換える必要がないように指定のパス以
 * 下のディレクトリを読んで動的にタスクを定義している。
 *
 * Rake に似た Jake というツールを利用しているが、2023-08 時点でこの
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

const { KintoneApps, needBuild, buildProcess, devProcess, proxyProcess, descWithProductionId } = require('../lib/apps.js')
const { readMetainfo } = require('../lib/metainfo.js')
const { getEnv } = require('../lib/util.js')

/**
 * @param {string} appDir
 * @returns {void}
 */
function defineDevkitTasks (appDir, ...funcs) {
  const apps = new KintoneApps(appDir)

  desc('default task')
  task('default', () => {
    console.log('default task')
  })

  desc('apps')
  task('apps', () => {
    console.log(apps.list().join('\n'))
  })

  desc('lint')
  task('lint', () => {
    apps.list().forEach((app) => {
      console.log(globSync(apps.path(app)))
    })
  })

  namespace('lint', () => {
    apps.list().forEach((app) => {
      desc(descWithProductionId(apps, app))
      task(app, async () => {
        await execa('yarn', ['run', 'eslint', `${apps.path(app)}`])
      })
    })
  })

  namespace('applyLocal', () => {
    apps.list().forEach((app) => {
      const meta = readMetainfo(apps.path(app))
      const envs = Object.keys(meta.app_id || {})
      envs.forEach((env) => {
        namespace(app, () => {
          const appId = meta.app_id[env]
          desc([appId, meta.name].join(':'))
          task(env, async () => {
            const devProccesses = [
              proxyProcess(appId, apps.path(app))
            ]

            if (needBuild(apps, app)) {
              devProccesses.push(buildProcess(app, 'development'))
            }

            await Promise.all(devProccesses)
          })
        })
      })
    })
  })

  namespace('dev', () => {
    apps.list().forEach((app) => {
      desc(descWithProductionId(apps, app))
      task(app, async () => {
        await devProcess(apps, app)
      })
    })
  })

  namespace('build', () => {
    apps.list().forEach((app) => {
      if (needBuild(apps, app)) {
        desc(descWithProductionId(apps, app))
        task(app, async () => {
          buildProcess(apps, app)
        })
      }
    })
  })

  namespace('deploy', () => {
    apps.list().forEach((app) => {
      const deps = needBuild(apps, app) ? [`build:${app}`] : []

      desc(descWithProductionId(apps, app))
      task(app, deps, async () => {
        await execa(
          'kintone-customize-uploader',
          [
            '--base-url', getEnv(process.env, 'KINTONE_BASE_URL'),
            '--username', getEnv(process.env, 'KINTONE_USERNAME'),
            '--password', `'${getEnv(process.env, 'KINTONE_PASSWORD')}'`,
            '-d', apps.path(app),
            `${resolve(apps.path(app), 'customize-manifest.json')}`
          ],
          { stdio: 'inherit', cwd: apps.path(app) }
        )
      })
    })
  })

  funcs.forEach((f) => {
    f.call(apps)
  })
}


module.exports = {
  defineDevkitTasks
}
