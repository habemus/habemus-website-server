// native dependencies
const path = require('path');
const http = require('http');

// third-party dependencies
const MongoClient = require('mongodb').MongoClient;
const enableDestroy = require('server-destroy');
const Bluebird = require('bluebird');

if (process.env.DEBUG === 'TRUE') {
  // set mongoose to debug mode
  require('mongoose').set('debug', true);
}

// constants
const TEST_DB_URI = 'mongodb://localhost:27017/h-website-test-db';
const TEST_RABBIT_MQ_URI = 'amqp://192.168.99.100';
const FIXTURES_PATH = path.join(__dirname, '../fixtures');

exports.fixturesPath = FIXTURES_PATH;

exports.defaultOptions = {
  apiVersion: '0.0.0',
  mongodbURI: TEST_DB_URI,
  hAccountURI: 'http://localhost:8000',
  hAccountToken: 'H_ACCOUNT_TOKEN',
  hProjectURI: 'http://localhost:8001',
  hProjectToken: 'H_PROJECT_TOKEN',
  rabbitMQURI: TEST_RABBIT_MQ_URI,

  hostDomain: 'habemus.xyz',

  websiteServerIpAddresses: ['127.0.0.0', '127.0.0.1']
};

/**
 * Generates an options object using
 * the passed options and adding default values to
 * empty options
 * @param  {Object} opts
 * @return {Object}
 */
exports.genOptions = function (opts) {
  return Object.assign({}, exports.defaultOptions, opts);
};

/**
 * Used to reject successful promises that should have not been fulfilled
 * @return {Bluebird Rejection}
 */
exports.errorExpected = function () {
  return Bluebird.reject(new Error('error expected'));
};

/**
 * Starts a server and keeps reference to it.
 * This reference will be used for teardown.
 */
exports.startServer = function (port, app) {

  if (!port) { throw new Error('port is required'); }
  if (!app) { throw new Error('app is required'); }

  // create http server and pass express app as callback
  var server = http.createServer();

  // make the server destroyable
  enableDestroy(server);

  server.on('request', app);

  return new Bluebird((resolve, reject) => {
    server.listen(port, () => {

      // register the server to be tore down
      exports.registerTeardown(function () {
        return new Bluebird(function (resolve, reject) {
          server.destroy((err) => {
            if (err) {

              console.warn('silent error upon destroying server on teardown', err);
              resolve();
            } else {
              resolve();
            }
          });
        })
      });

      // resolve with the server
      resolve(server);
    });
  });
};

/**
 * Sets up an assets object that is ready for the tests
 * @return {[type]} [description]
 */
exports.setup = function () {

  var _assets = {};

  return MongoClient.connect(TEST_DB_URI)
    .then((db) => {

      _assets.db = db;

      // register teardown
      exports.registerTeardown(function () {

        // drop database
        return db.dropDatabase().then(() => {
          return db.close();
        });
      });

      return db.dropDatabase();
    })
    .then(() => {
      return _assets;
    });
};

var TEARDOWN_CALLBACKS = [];

/**
 * Register a teardown function to be executed by the teardown
 * The function should return a promise
 */
exports.registerTeardown = function (teardown) {
  TEARDOWN_CALLBACKS.push(teardown);
};

/**
 * Executes all functions listed at TEARDOWN_CALLBACKS
 */
exports.teardown = function () {
  return Bluebird.all(TEARDOWN_CALLBACKS.map((fn) => {
    return fn();
  }))
  .then(() => {
    TEARDOWN_CALLBACKS = [];
  });
};
