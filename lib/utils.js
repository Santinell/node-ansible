var _ = require('lodash');
var childProcess = require('child_process');

module.exports.spawnAsync = function(cmd, params, options) {
  return new Promise((resolve, reject) => {
    const spawnOptions = _.omit(options, ['onData']);
    const cp = childProcess.spawn(cmd, params, spawnOptions);
    if (!options.detached && options.onData && typeof options.onData === 'function') {
      cp.stderr.on('data', function(data) {
        options.onData('stderr', data);
      });
      cp.stdout.on('data', function(data) {
        options.onData('stdout', data);
      });
    }
    cp.on('close', code => {
      if (code === 0) {
        return resolve();
      }
      reject(new Error(`Process closed with code=${code}`));
    });
    cp.on('error', reject);
  });
}

module.exports.formatArgs = function(args, freeform) {
  var formattedArgs = [];

  // Freeform arg should come first
  if (freeform) {
    formattedArgs.push(freeform);
  }

  // Only then structured args
  if (args && !_.isEmpty(args)) {
    for (var key in args) {
      var value = args[key];
      var keyValue = key + "=" + value;
      formattedArgs.push(keyValue);
    }
  }

  if (formattedArgs.length > 0) {
    return formattedArgs.join(" ");
  }

  return null;
}
