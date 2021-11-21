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

async function spinnerStart(msg, spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner
  const spinner = new Spinner(msg + ' %s')
  spinner.setSpinnerString(spinnerString)
  spinner.start()
  return spinner
}
async function sleep(timeout = 1000) {
  await new Promise(r => setTimeout(r, timeout))
}
module.exports = {
  isObject,
  pathExistsSync,
  spinnerStart,
  sleep,
};
