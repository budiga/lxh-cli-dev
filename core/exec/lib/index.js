'use strict';

const path = require('path')
const Package = require('@lxh-cli-dev/package')
const log = require('@lxh-cli-dev/log')

const SETTINGS = {
  init: '@lxh-cli-dev/core'
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
      require(rootFile).apply(null, arguments)
    }
  }

}

module.exports = exec;
