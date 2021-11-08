'use strict';

const path = require('path')
const cp = require('child_process')
const Package = require('@lxh-cli-dev/package')
const log = require('@lxh-cli-dev/log')

const SETTINGS = {
  init: '@lxh-cli-dev/init'
}
const CACHE_DIR = 'dependencies'

async function exec() {
  const homePath = process.env.CLI_HOME_PATH
  let targetPath = process.env.CLI_TARGET_PATH
  let storeDir, pkg

  const cmdObj = arguments[arguments.length - 1]
  const cmdName = cmdObj.name()
  const packageName = SETTINGS[cmdName]
  const packageVersion = 'latest'

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR) // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules')
    // 输入 l-cli init --debug test-project --force
    // 打印 ----- targetPath ----- /Users/liuxuehuan/.lxh-cli-dev/dependencies
    // 打印 ----- storeDir ----- /Users/liuxuehuan/.lxh-cli-dev/dependencies/node_modules
    log.verbose('targetPath', targetPath)
    log.verbose('storeDir', storeDir)
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    })
    const exists = await pkg.exists()
    if (exists) {
      await pkg.update()
    } else {
      await pkg.install()
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    })
    const rootFile = pkg.getRootFilePath()
    if (rootFile) {
      try {
        // require(rootFile).call(null, Array.from(arguments))
        const args = Array.from(arguments)
        const cmd = args[args.length - 1]
        const o = Object.create(null)
        Object.keys(cmd).forEach(key => {
          if (cmd.hasOwnProperty(key) &&
            !key.startsWith('_') &&
            key !== 'parent') {
            o[key] = cmd[key]
          }
        })
        args[args.length - 1] = o

        const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
        const child = cp.spawn('node', ['-e', code], {
          cwd: process.cwd(),
          stdio: 'inherit',
        })
        child.on('error', e => {
          log.error(e.message)
          process.exit(1)
        })
        child.on('exit', c => {
          log.verbose('命令执行成功:' + c)
          process.exit(c)
        })
      } catch (error) {
        log.error(error.message)
      }
    }
  }

}

module.exports = exec;
