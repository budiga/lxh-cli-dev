'use strict';

const semver = require('semver')
const colors = require('colors')
const log = require('@lxh-cli-dev/log')
const contant = require('./const')

class Command {
  constructor(argv) {
    this._argv = argv
    if (!argv) {
      throw new Error('Command参数不能为空')
    }
    if (!Array.isArray(argv)) {
      throw new Error('Command参数必须为数组')
    }
    if (argv.length < 1) {
      throw new Error('Command参数列表为空')
    }
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain.then(() => this.checkNodeVersion())
      chain.then(() => this.initArgs())
      chain.then(() => this.init())
      chain.then(() => this.exec())
      chain.catch((err) => {
        log.error(err.message)
      })
    })
  }
  checkNodeVersion() {
    const currentVersion = process.version
    const lowestVersion = contant.LOWEST_NODE_VERSION

    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`lxh-cli 需要安装v${lowestVersion}版本以上的Node.js！`))
    }
  }
  initArgs() {
    this._cmd = this._argv[this._argv.length - 1]
    this._argv = this._argv.slice(0, this._argv.length - 1)
  }
  init() {
    throw new Error('init 必须实现')
  }
  exec() {
    throw new Error('exec 必须实现')
  }
}

module.exports = Command;
