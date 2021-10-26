'use strict';

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function pathExistsSync(path) {
  const fs = require('fs')
  try {
    fs.accessSync(path);
    return true;
	} catch {
		return false;
	}
}
module.exports = {
  isObject,
  pathExistsSync
};
