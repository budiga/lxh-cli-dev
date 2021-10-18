'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo(npmName, registry) {
  if (!npmName) return
  const registryUrl = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(registryUrl, npmName)
  return axios.get(npmInfoUrl).then(res => {
    if (res.status === 200) {
      return res.data
    }
  }).catch(err => {
    Promise.reject(err)
  })
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
}
module.exports = {
  getNpmInfo,
  getNpmVersions,
}
