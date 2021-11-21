const request = require('@lxh-cli-dev/request')

module.exports = function (params) {
  return request({
    url: 'project/template'
  })
}
