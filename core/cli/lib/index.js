'use strict';
module.exports = core;

// import rootCheck from 'root-check';
const semver = require('semver')
const colors = require('colors')
const userHome = require('user-home')
// const pathExists = require('path-exists').sync
const pkg = require('../package.json')
const log = require('@lxh-cli-dev/log')
const contant = require('./const')

function core() {
  try {
    checkPkgVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
  } catch (e) {
    log.error(e.message)
  }
}

function checkPkgVersion() {
  log.info('cli', pkg.version)
}

function checkNodeVersion() {
  const currentVersion = process.version
  const lowestVersion = contant.LOWEST_NODE_VERSION

  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`lxh-cli 需要安装v${lowestVersion}版本以上的Node.js！`))
  }
}

async function checkRoot() {
  const rootCheck = await import('root-check')
  rootCheck.default()
}

async function checkUserHome() {
  console.log('----- userHome -----', userHome)
  const pathExists = import('path-exists')
  if (!userHome || !(await (await pathExists).default(userHome))) {
    throw new Error('用户主目录不存在')
  }
}
