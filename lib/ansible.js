var _ = require('lodash');
var childProcess = require('child_process');
var inherits = require('util').inherits;
var utils = require('./utils');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var slice = [].slice;

var AbstractAnsibleCommand = function() {
  EventEmitter.call(this);
};

inherits(AbstractAnsibleCommand, EventEmitter);

AbstractAnsibleCommand.prototype.exec = function(options) {
  // Validate execution configuration
  var errors = this.validate();
  if (errors.length > 0) {
    var error = new Error('Ansible execution was mis-configured');
    error.reason = errors;
    return Promise.reject(error)
  }

  options = options || {};
  var self = this;
  var unbuffered = (options.buffered) ? '' : '1';
  var processOptions = {
    debug: options.debug || false,
    detached: options.detached || false,
    env: _.extend({
      PATH: process.env.PATH,
      PYTHONUNBUFFERED: unbuffered
    }, options.env || {})
  };

  if (options.cwd) {
    processOptions.cwd = options.cwd;
  }

  if (processOptions.detached) {
    processOptions.stdio = ['ignore', 'ignore', 'ignore'];
  }
  var cmd = this.commandName();
  var params = this.compileParams();
  return new Promise(function(resolve, reject) {
    var child = childProcess.spawn(cmd, params, processOptions);
    if (!processOptions.detached && options.debug) {
      child.stderr.on('data', function(data) {
        self.emit('stderr', data);
      });
      child.stdout.on('data', function(data) {
        self.emit('stdout', data);
      });
    }
    child.on('exit', function(code) {
      if (options.debug) {
        console.log(`Exit. Code=${code}`);
      }
      if (code !== 0) {
        return reject(new Error(`Process closed with code=${code}`));
      }
      resolve();
    });
    child.on('error', reject);
  });
};

AbstractAnsibleCommand.prototype.privateKey = function(privateKey) {
  this.config.privateKey = privateKey;
  return this;
};

AbstractAnsibleCommand.prototype.forks = function(forks) {
  this.config.forks = forks;
  return this;
};

AbstractAnsibleCommand.prototype.verbose = function(level) {
  this.config.verbose = level;
  return this;
};

AbstractAnsibleCommand.prototype.user = function(user) {
  this.config.user = user;
  return this;
};

AbstractAnsibleCommand.prototype.inventory = function(inventory) {
  this.config.inventory = inventory;
  return this;
};

AbstractAnsibleCommand.prototype.limit = function(limit) {
  this.config.limit = limit;
  return this;
};

AbstractAnsibleCommand.prototype.su = function(su) {
  this.config.su = su;
  return this;
};

AbstractAnsibleCommand.prototype.asSudo = function() {
  this.config.sudo = true;
  return this;
};

AbstractAnsibleCommand.prototype.addParam = function(commandParams, param, flag) {
  if (this.config[param]) {
    commandParams = commandParams.concat(flag, this.config[param]);
  }
  return commandParams;
};

AbstractAnsibleCommand.prototype.addVerbose = function(commandParams) {
  if (this.config.verbose) {
    commandParams = commandParams.concat('-' + this.config.verbose);
  }
  return commandParams;
};

AbstractAnsibleCommand.prototype.addSudo = function(commandParams) {
  if (this.config.sudo) {
    commandParams = commandParams.concat('-s');
  }
  return commandParams;
};

AbstractAnsibleCommand.prototype.commonCompileParams = function(commandParams) {
  commandParams = this.addParam(commandParams, "forks", "-f");
  commandParams = this.addParam(commandParams, "user", "-u");
  commandParams = this.addParam(commandParams, "inventory", "-i");
  commandParams = this.addParam(commandParams, "limit", "-l");
  commandParams = this.addParam(commandParams, "privateKey", "--private-key");
  commandParams = this.addParam(commandParams, "su", "-U");
  commandParams = this.addVerbose(commandParams);
  commandParams = this.addSudo(commandParams);

  return commandParams;
};

var AdHoc = function() {

  AbstractAnsibleCommand.call(this);

  this.commandName = function() {
    return 'ansible';
  }

  this.config = {};

  this.module = function(module) {
    this.config.module = module;
    return this;
  }

  this.args = function(args, freeform) {
    if (!_.isObject(args)) {
      freeform = args;
      args = null;
    }

    this.config.args = args;
    this.config.freeform = freeform;
    return this;
  }

  this.hosts = function(hosts) {
    this.config.hosts = hosts;
    return this;
  }

  this.validate = function() {
    var errors = [];
    var config = this.config;

    // Hosts are mandatory
    if (_.isUndefined(config.hosts) || _.isNull(config.hosts)) {
      errors.push('"hosts" must be specified');
    }

    // Module is mandatory
    if (_.isUndefined(config.module) || _.isNull(config.module)) {
      errors.push('"module" must be specified');
    }

    return errors;
  }

  this.compileParams = function() {
    var result = [
      this.config.hosts,
      '-m',
      this.config.module
    ];

    if (this.config.args || this.config.freeform) {
      var args = utils.formatArgs(this.config.args, this.config.freeform);
      result = result.concat('-a', args);
    }

    result = this.commonCompileParams(result);

    return result;
  }

}

inherits(AdHoc, AbstractAnsibleCommand);

var Playbook = function() {

  AbstractAnsibleCommand.call(this);

  this.commandName = function() {
    return 'ansible-playbook';
  }

  this.config = {};

  this.askPass = function() {
    this.config.askPass = true;
    return this;
  }

  this.askSudoPass = function() {
    this.config.askSudoPass = true;
    return this;
  }

  this.playbook = function(playbook) {
    this.config.playbook = playbook;
    return this;
  }

  this.variables = function(variables) {
    this.config.variables = variables;
    return this;
  }

  this.tags = function() {
    var args
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (_.isString(args)) args = Array(args);
    this.config.tags = args;
    return this;
  }

  this.skipTags = function() {
    var args
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (_.isString(args)) args = Array(args);
    this.config.skipTags = args;
    return this;
  }

  this.addTags = function() {
    return ('--tags=' + this.config.tags.join(','));
  }

  this.addSkipTags = function() {
    return ('--skip-tags=' + this.config.skipTags.join(','));
  }

  this.validate = function() {
    var errors = [];

    // Playbook is mandatory
    if (_.isUndefined(this.config.playbook) || _.isNull(this.config.playbook)) {
      errors.push("'playbook' must be specified")
    }

    return errors;
  }

  this.compileParams = function() {
    var result = [
      this.config.playbook + ".yml"
    ];

    if (this.config.variables) {
      var args = JSON.stringify(this.config.variables);
      result = result.concat('-e', args);
    }

    if (this.config.askPass) {
      result = result.concat('--ask-pass');
    }

    if (this.config.askSudoPass) {
      result = result.concat('--ask-sudo-pass');
    }

    if (this.config.tags) {
      var tags = this.addTags();
      result = result.concat(tags);
    }

    if (this.config.skipTags) {
      var skipTags = this.addSkipTags();
      result = result.concat(skipTags);
    }

    result = this.commonCompileParams(result);

    return result;
  }
}

inherits(Playbook, AbstractAnsibleCommand);

module.exports.AdHoc = AdHoc;
module.exports.Playbook = Playbook;
