'use strict';
module.exports = core;

const fs = require('fs')
const path = require('path');
const semver = require('semver')
const colors = require('colors')
const userHome = require('user-home')
const commander = require('commander')
const log = require('@lxh-cli-dev/log')
const init = require('@lxh-cli-dev/init')
const pkg = require('../package.json')
const contant = require('./const');


let args, config

const program = new commander.Command()

async function core() {
  try {
    checkPkgVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    // checkInputArgs()
    checkEnv()
    await checkGlobalUpdate()
    registerCommand()
  } catch (e) {
    log.error(e.message)
  }
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(init)

  // 监听debug参数
  program.on('option:debug', function(v) {
    if (program._optionValues.debug) { // TODO: program.debug不能获取到？
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
    log.level = process.env.LOG_LEVEL
  })
  // 监听未知命令
  program.on('command:*', function(obj) {
    const cmds = program.commands.map(cmd => cmd.name())
    log.warn('', colors.red('未知的命令：' + obj[0]))
    log.info('', '可用命令为：' + cmds.join(','))
  })

  program.parse(process.argv)

  if (program.args && program.args.length < 1) {
    program.outputHelp()
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

function checkUserHome() {
  if (!userHome || !pathExistsSync(userHome)) {
    throw new Error(colors.red('当前登陆用户主目录不存在'))
  }
}
function pathExistsSync(path) {
  try {
    fs.accessSync(path);
    return true;
	} catch {
		return false;
	}
}

// function checkInputArgs() {
//   const minimist = require('minimist')
//   args = minimist(process.argv.slice(2))
//   checkArgs()
// }
// function checkArgs() {
//   if (args.debug) {
//     process.env.LOG_LEVEL = 'verbose'
//   } else {
//     process.env.LOG_LEVEL = 'info'
//   }
//   log.level = process.env.LOG_LEVEL
// }

function checkEnv() {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExistsSync(dotenvPath)) {
    config = dotenv.config({
      path: dotenvPath
    })
  } else {
    config = createDefaultConfig()
  }
  log.verbose('环境变量', process.env.CLI_HOME_PATH)
}
function createDefaultConfig() {
  const cliConfig = {
    home: userHome
  }
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, contant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
  return cliConfig
}

async function checkGlobalUpdate() {
  const currentVersion = pkg.version
  const npmName = pkg.name

  const { getNpmVersions } = require('@lxh-cli-dev/get-npm-info')
  const npmVersions = await getNpmVersions(npmName)
  const lastVersion = npmVersions[0]
  if (lastVersion) {
    if (semver.gt(lastVersion, currentVersion)) {
      log.warn('', `${npmName}版本太低，当前版本：${currentVersion}，最新版本：${lastVersion}，请升级至最新版本。`)
    }
  }
}
