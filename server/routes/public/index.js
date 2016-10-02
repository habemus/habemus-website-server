// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

module.exports = function (app, options) {

  const errors = app.errors;

  var _cors = app.middleware.cors({
    corsWhitelist: options.corsWhitelist
  });
  app.options('*', _cors);
  app.use(_cors);

  require('./domain-record')(app, options);
};