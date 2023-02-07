'use strict';

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const fse = require('fs-extra')
const semver = require('semver')
const userHome = require('user-home')
const ejs = require('ejs')
const glob = require('glob')
const Command = require('@lxh-cli-dev/command')
const Package = require('@lxh-cli-dev/package')
const log = require('@lxh-cli-dev/log')
const { spinnerStart, sleep, execAsync } = require('@lxh-cli-dev/utils')
const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'
const WHITE_CMDS = ['npm', 'cnpm']
class initCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = this._argv[1].force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec() {
    try {
      const projectInfo = await this.prepare()
      if (projectInfo) {
        log.verbose('projectInfo', projectInfo)
        this.projectInfo = projectInfo
        // 下载模版
        await this.downloadTemplate()
        // 安装模版
        await this.installTemplate()
      }
    } catch (error) {
      log.error(error.message)
      if (process.env.LOG_LEVEL === 'verbose') {
        console.log(error)
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 普通安装
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate()
      }
    } else {
      throw new Error('找不到模版信息')
    }
  }

  ejsRender(ignore) {
    const dir = process.cwd()
    return new Promise((resolve, reject) => {
      glob('**', {
        cwd: dir,
        ignore,
        nodir: true,
      }, (err, files) => {
        if (err) reject(err)
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file)
          return new Promise((res, rej) => {
            ejs.renderFile(filePath, this.projectInfo, {}, (error, result) => {
              if (error) {
                rej(error)
              } else {
                fse.writeFileSync(filePath, result)
                res(result)
              }
            })
          })
        })).then(() => {
          resolve()
        }).catch(err => {
          reject(err)
        })
      })
    })
  }

  async installNormalTemplate() {
    // let spinner = spinnerStart('正在安装模版')
    console.log('----- 正在安装模版 -----')
    try {
      // 拷贝代码至当前目录
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      const targetPath = process.cwd()
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath)
    } catch (error) {
      throw error
    } finally {
      console.log('----- 模版安装成功 -----')
      // spinner.stop(true)
    }
    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ['node_modules/**', ...templateIgnore]
    await this.ejsRender(ignore)
    const { installCommand, startCommand } = this.templateInfo
    await this.execCommand(installCommand) // 安装依赖
    await this.execCommand(startCommand) // 启动命令执行
  }

  async installCustomTemplate() {
    if (this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath()
      if (fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模版')
        const options = {
          ...this.templateInfo,
          cwd: process.cwd()
        }
        const code = `require(${rootFile})(${JSON.stringify(options)})`
        log.verbose('code', code)
        await execAsync('node', ['-e', code], {
          stdio: 'inherit',
          cwd: process.cwd()
        })
        log.success('自定义模版安装成功')
      } else {
       throw new Error('自定义模版安装文件不存在')
      }
    }
  }

  async execCommand(command, errMessage) {
    if (!command) return
    let ret
    const cmds = command.split(' ')
    const cmd = this.checkCommand(cmds[0])
    if (!cmd) throw new Error('命令不存在，命令：' + command)
    const args = cmds.slice(1)
    ret = await execAsync(cmd, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    if (ret !== 0) {
      throw new Error(`${command}执行不成功`)
    }
  }
  checkCommand(cmd) {
    if (WHITE_CMDS.includes(cmd)) return cmd
    return null
  }

  async downloadTemplate() {
    // 1. 通过项目模版api获取模版信息
    // 1.1 egg搭建后端系统 1.2 通过npm存储项目模版 1.3 模版信息存到mongodb 1.4 egg获取mongodb的数据并通过api返回
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    this.templateInfo = templateInfo
    const targetPath = path.resolve(userHome, '.lxh-cli-dev', 'template')
    const storeDir = path.resolve(userHome, '.lxh-cli-dev', 'template', 'node_modules')
    const { npmName, version } = templateInfo
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    })
    if (!await templateNpm.exists()) {
      // const spinner = spinnerStart('正在下载模版..')
      console.log('----- 正在下载模版.. -----')
      await sleep()
      try {
        await templateNpm.install()
      } catch (error) {
        throw error
      } finally {
        if (await templateNpm.exists()) {
          log.success('下载模版成功')
          this.templateNpm = templateNpm
        }
      }
      // spinner.stop(true) // TODO: spinner.stop在这里会报错？why？
    } else {
      // const spinner = spinnerStart('正在更新模版..')
      console.log('----- 正在更新模版.. -----')
      await sleep()
      try {
        await templateNpm.update()
      } catch (error) {
        throw error
      } finally {
        if (await templateNpm.exists()) {
          log.success('更新模版成功')
          this.templateNpm = templateNpm
        }
      }
      // spinner.stop(true)
    }

  }

  async prepare() {
    const template = await getProjectTemplate()
    if (!template || template.length === 0) {
      throw new Error('项目模版不存在')
    }
    this.template = template

    const localPath = process.cwd() // 当前运行命令的文件夹路径,等价写法：path.resolve('.')
    if(!this.isDirEmpty(localPath)) {
      let ifContinue
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: 'comfirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？',
        })).ifContinue
        if (!ifContinue) return
      }
      // 2.是否启动强制更新
      if (['y', 'Y'].indexOf(ifContinue) > -1 || this.force) {
        const { comfirmDelete } = await inquirer.prompt({
          type: 'comfirm',
          name: 'comfirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？',
        })
        if (comfirmDelete) fse.emptyDirSync(localPath)
      }
    }
    return this.getProjectInfo()
  }

  async getProjectInfo() {
    function isValidateName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
    }
    let projectInfo = {}
    // 1.选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      message: '请选择初始化类型',
      name: 'type',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT,
      }, {
        name: '组件',
        value: TYPE_COMPONENT,
      }],
    })
    let isProjectNameValid = false
    if (isValidateName(this.projectName)) {
      isProjectNameValid = true
      projectInfo.projectName = this.projectName
    }
    this.template = this.template.filter(t => t.tag.includes(type))
    const title = type === TYPE_PROJECT ? '项目' : '组件'
    const projectPrompt = []
    // 2.获取项目的基本信息
    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: '请输入项目名称',
      default: '',
      filter: function(v) {
        return v
      },
      validate: function(v) {
        // 首字符必须为字母
        // 尾字符必须为字母或数字
        // 字符仅允许'-_', \w = 'a-zA-Z0-9_'
        // 合法：a, a1,  a-b, a_b, a-b1-c1, a_b1_c1, 不合法：1，a_，a_1
        const done = this.async()
        setTimeout(function () {
          if (!isValidateName(v)) {
            done('请输入合法名称，')
            return
          }
          done(null, true)
        }, 300);
      }
    }
    if (!isProjectNameValid) projectPrompt.push(projectNamePrompt)
    projectPrompt.push({
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}版本号`,
      default: '1.0.0',
      filter: function(v) {
        const v2 = semver.valid(v)
        if (!!v2) return v2
        return v
      },
      validate: function(v) {
        const done = this.async()
        const ok = !!semver.valid(v)
        setTimeout(function () {
          if (!ok) {
            done('请输入合法版本号')
            return
          }
          done(null, true)
        }, 300);
      },
    },
    {
      type: 'list',
      name: 'projectTemplate',
      message: `请选择${title}模版`,
      choices: this.createTemplateChoice(),
    })
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(projectPrompt)

      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      }
    } else if (type === TYPE_COMPONENT) {
      const desPrompt = {
        type: 'input',
        name: 'componentDes',
        message: '请输入组件描述信息',
        default: '',
        validate: function(v) {
          const done = this.async()
          setTimeout(function () {
            if (!v) {
              done('请输入组件描述信息')
              return
            }
            done(null, true)
          });
        },
      }
      projectPrompt.push(desPrompt)
      const component = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      }
    }

    // 生成className
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if (projectInfo.componentDes) {
      projectInfo.description = projectInfo.componentDes
    }
    return projectInfo
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath)
    fileList = fileList.filter(file => (
      !file.startsWith('.')
      && ['node_modules'].indexOf(file) < 0
    ))
    return fileList.length <= 0
  }
  createTemplateChoice() {
    return this.template.map(t => ({
      value: t.npmName,
      name: t.name,
    }))
  }
}

function init(argv) {
  return new initCommand(argv)
}


module.exports = init;
module.exports.initCommand = initCommand;
