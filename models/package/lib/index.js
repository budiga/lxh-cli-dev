'use strict';

const path = require('path')
const fse = require('fs-extra')
const pkgUp = require('pkg-up').sync
const npminstall = require('npminstall')
const { isObject } = require('@lxh-cli-dev/utils')
const formatPath = require('@lxh-cli-dev/format-path')
const { getDefaultRegistry, getNpmLatestVersion } = require('@lxh-cli-dev/get-npm-info')
const {pathExistsSync} = require('@lxh-cli-dev/utils')


class Package {
  constructor(options) {
    if (!options){
      throw new Error('Package类的options参数不能为空')
    }
    if (!isObject(options)) {
      throw new Error('Package类的options参数必须为对象')
    }
    this.targetPath = options.targetPath // package的目标路径
    this.storeDir = options.storeDir // package的缓存路径
    this.packageName = options.packageName // package的名字
    this.packageVersion = options.packageVersion // package的版本

    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  async prepare() {
    if (this.storeDir && !pathExistsSync(this.storeDir)) {
      fse.mkdirpSync(this.storeDir)
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  get cacheFilePath () {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }
  async exists() {
    if (this.storeDir) {
      await this.prepare()
      return pathExistsSync(this.cacheFilePath)
    } else {
      return pathExistsSync(this.targetPath)
    }
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
  }

  async update() {
    await this.prepare()
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
    if (!pathExistsSync(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion,
        }]
      })
      this.packageVersion = latestPackageVersion
    }
  }
  async install() {
    await this.prepare()
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.packageName,
        version: this.packageVersion
      }]
    })
  }

  // 获取入口文件路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      const dir = pkgUp({ // 获取package.json路径
        cwd: targetPath
      })
      if (dir) {
        const pkgFile = require(dir) // 读取package.json内容
        if (pkgFile && pkgFile.main) {
          return formatPath(path.resolve(dir.replace('/package.json', ''), pkgFile.main))
        }
      }
      return null
    }

    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }
  }
}

module.exports = Package
