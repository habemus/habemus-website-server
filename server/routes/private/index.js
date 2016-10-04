// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

module.exports = function (app, options) {

  const errors = app.errors;

  /**
   * Authenticate all private routes
   */
  app.use('/_', app.middleware.authenticatePrivate(options));

  require('./website')(app, options);
};
