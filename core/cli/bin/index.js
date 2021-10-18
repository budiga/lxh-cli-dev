#! /usr/bin/env node

// import importLocal from 'import-local'
const importLocal = require('import-local')
if (importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用lxh-cli本地版本')
} else {
  require('../lib')(process.argv.slice(2))
}
