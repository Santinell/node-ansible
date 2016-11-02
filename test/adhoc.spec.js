var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');

var sinonChai = require("sinon-chai");
var chaiAsPromised = require('chai-as-promised');
var cp = require('child_process');
var mockSpawn = require('mock-spawn');

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('AdHoc command', function() {

  var mySpawn = mockSpawn();
  var oldSpawn = cp.spawn;
  var spawnSpy;
  var default_env = { env: { PYTHONUNBUFFERED: "1" } };

  before(function() {
    cp.spawn = mySpawn;
    spawnSpy = sinon.spy(cp, 'spawn');
  })

  beforeEach(function() {
    spawnSpy.reset();
  })

  var AdHoc = require("../index").AdHoc;

  describe('with no structured args and freeform arg', function() {

    it('should be translated successfully to ansible command', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'");
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'']);
        done();
      }).catch(done);
    })

  })

  describe('with no hosts', function() {

    it('should be rejected', function() {
      var command = new AdHoc().module('shell').args("echo 'hello'");
      expect(command.exec()).to.be.rejected;
    })

    it('should include reason in rejection', function(done) {
      var command = new AdHoc().module('shell').args(null, "echo 'hello'");
      expect(command.exec()).to.be.rejected.then(function(error) {
        expect(error).to.have.property('reason');
        expect(error.reason).to.be.array;
        expect(error.reason).to.have.length(1);
        done();
      })
    })

  })

  describe('with no module', function() {

    it('should be rejected', function() {
      var command = new AdHoc().hosts('local').args("echo 'hello'");
      expect(command.exec()).to.be.rejected;
    })

  })

  describe('with forks', function() {

    it('should contain forks flag in execution', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'").forks(10);
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'', '-f', 10]);
        done();
      }).catch(done);
    })
  })

  describe('with verbose', function() {

    it('should contain verbose flag in execution', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'").verbose("vvv");
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'', '-vvv']);
        done();
      }).catch(done);
    })
  })

  describe('with user', function() {

    it('should contain user flag in execution', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'").user("root");
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'', '-u', 'root']);
        done();
      }).catch(done);
    })
  })

  describe('as sudo user', function() {

    it('should contain sudo user flag in execution', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'").asSudo();
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'', '-s']);
        done();
      }).catch(done);
    })
  })

  describe('with sudo user specified', function() {

    it('should contain sudo user flag in execution', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'").su('root');
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'', '-U', 'root']);
        done();
      }).catch(done);
    })
  })

  describe('with inventory', function() {

    it('should contain inventory flag in execution', function(done) {
      var command = new AdHoc().module('shell').hosts('local').args("echo 'hello'").inventory("/etc/my/hosts");
      expect(command.exec()).to.be.fulfilled.then(function() {
        expect(spawnSpy).to.be.calledWith('ansible', ['local', '-m', 'shell', '-a', 'echo \'hello\'', '-i', '/etc/my/hosts']);
        done();
      }).catch(done);
    })
  })

  after(function() {
    process.spawn = oldSpawn;
    spawnSpy.restore();
  })

})
