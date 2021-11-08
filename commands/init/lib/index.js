'use strict';
const Command = require('@lxh-cli-dev/command')
const log = require('@lxh-cli-dev/log')

class initCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    this.force = this._argv[1].force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }
  exec() {
    console.log('----- init 业务逻辑-----')
  }
}

function init(argv) {
  return new initCommand(argv)
}


module.exports = init;
module.exports.initCommand = initCommand;
