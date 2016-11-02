var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var _ = require('underscore');

var sinonChai = require("sinon-chai");
var chaiAsPromised = require('chai-as-promised');
var cp = require('child_process');
var mockSpawn = require('mock-spawn');

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('Playbook command', function () {

  var mySpawn = mockSpawn();
  var oldSpawn = cp.spawn;
  var spawnSpy;
  var default_env = { env: { PYTHONUNBUFFERED: "1" } };


  before(function () {
    cp.spawn = mySpawn;
    spawnSpy = sinon.spy(cp, 'spawn');
  })

  beforeEach(function() {
    spawnSpy.reset();
  })

  var Playbook = require("../index").Playbook;

  describe('with only playbook', function () {

    it('should execute the playbook', function (done) {
      var command = new Playbook().playbook('test');
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml'] );
        done();
      }).catch(done);
    })

  })

  describe('with variables', function () {

    it('should execute the playbook with the given variables', function (done) {
      var command = new Playbook().playbook('test').variables({foo: "bar"});
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-e', '{"foo":"bar"}']);
        done();
      }).catch(done);
    })

    it('should execute the playbook with the given complex variables', function (done) {
      variable = {
        foo: {
          bar: ["shu"]
        }
      };
      var command = new Playbook().playbook('test').variables(variable);

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-e', '{"foo":{"bar":["shu"]}}']);
        done();
      }).catch(done);
    })

  })

  describe('with forks', function() {

    it('should execute the playbook with forks param as specified', function (done) {
      var command = new Playbook().playbook('test').forks(10);
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-f', 10]);
        done();
      }).catch(done);
    })

  })

  describe('with verbose', function() {

    it('should execute the playbook with verbosity level', function (done) {
      var command = new Playbook().playbook('test').verbose("vv");
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-vv']);
        done();
      }).catch(done);
    })

  })

  describe('with user', function() {

    it('should execute the playbook with specified user', function (done) {
      var command = new Playbook().playbook('test').user("root");
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-u', 'root']);
        done();
      }).catch(done);
    })

  })

  describe('with sudo user specified', function() {

    it('should execute the playbook with specified sudo user', function (done) {
      var command = new Playbook().playbook('test').su("root");
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-U', 'root']);
        done();
      }).catch(done);
    })

  })

  describe('as sudo user', function() {

    it('should execute the playbook with sudo user flag', function (done) {
      var command = new Playbook().playbook('test').asSudo();
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '-s']);
        done();
      }).catch(done);
    })

  })

  describe('with inventory', function() {

    it('should execute the playbook with specified inventory', function (done) {
      var command = new Playbook().playbook('test').inventory("/etc/my/hosts");
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook' ,['test.yml', '-i', '/etc/my/hosts']);
        done();
      }).catch(done);
    })

  })

  describe('with working directory', function () {

    var path = require('path');

    it('should change to working directory during execution', function (done) {
      var command = new Playbook().playbook('test');
      var workingDir = path.resolve(__dirname, './fixtures');
      var options = {cwd: workingDir}
      var promise = command.exec(options);
      expect(promise).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml']);
        expect(spawnSpy.getCall(0).args[2]).to.have.deep.property( "cwd", workingDir );
        expect(spawnSpy.getCall(0).args[2]).to.have.deep.property( "env.PYTHONUNBUFFERED", "1" );
        done();
      }).catch(done);
    })

  })

  describe('unbuffered output', function () {

    it('should default to unbuffered', function (done) {
      var command = new Playbook().playbook('test');
      var promise = command.exec();
      expect(promise).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml']);
        expect(spawnSpy.getCall(0).args[2]).to.have.deep.property( "env.PYTHONUNBUFFERED", "1" );
        done();
      }).catch(done);
    })

    it('should turn on buffering when told to', function (done) {
      var command = new Playbook().playbook('test');
      var promise = command.exec({buffered:true});
      expect(promise).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml'] );
        expect(spawnSpy.getCall(0).args[2]).to.have.deep.property( 'env.PYTHONUNBUFFERED', "" );
        done();
      }).catch(done);
    })

  })

  describe('with --ask-pass flag', function() {

    it('should execute the playbook with --ask-pass flag', function (done) {
      var command = new Playbook().playbook('test').askPass();
      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '--ask-pass']);
        done();
      }).catch(done);
    })
  })

  describe('with --ask-sudo-pass flag', function() {

    it('should execute the playbook with --ask-sudo-pass flag', function (done) {
      var command = new Playbook().playbook('test').askSudoPass();

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '--ask-sudo-pass']);
        done();
      }).catch(done);
    })
  })

  describe('with --tags param', function() {

    it('should execute the playbook with --tags', function (done) {
      var command = new Playbook().playbook('test').tags('onetag');

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', "--tags=onetag"]);
        done();
      }).catch(done);
    })

    it('should execute the playbook with multiple --tags', function (done) {
      var command = new Playbook().playbook('test').tags('onetag','twotags');

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', "--tags=onetag,twotags"]);
        done();
      }).catch(done);
    })

    it('should execute the playbook with array of --tags', function (done) {
      var command = new Playbook().playbook('test').tags(['onetag','twotags']);

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', "--tags=onetag,twotags"]);
        done();
      }).catch(done);
    })
  })

  describe('with --skip-tags param', function() {

    it('should execute the playbook with --skip-tags', function (done) {
      var command = new Playbook().playbook('test').skipTags('onetag');

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '--skip-tags=onetag']);
        done();
      }).catch(done);
    })

    it('should execute the playbook with multiple --skip-tags', function (done) {
      var command = new Playbook().playbook('test').skipTags('onetag','twotags');

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '--skip-tags=onetag,twotags']);
        done();
      }).catch(done);
    })

    it('should execute the playbook with array of --skip-tags', function (done) {
      var command = new Playbook().playbook('test').skipTags(['one tag','twotags']);

      expect(command.exec()).to.be.fulfilled.then(function () {
        expect(spawnSpy).to.be.calledWith('ansible-playbook', ['test.yml', '--skip-tags=one tag,twotags']);
        done();
      }).catch(done);
    })
  })

  after(function () {
    cp.spawn = oldSpawn;
    spawnSpy.restore();
  })

})
