'use strict';

function init(projectName, cmdObj) {
  console.log('----- commands[init] -----', projectName, cmdObj.force, process.env.CLI_TARGET_PATH)
}


module.exports = init;
