// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

module.exports = function (app, options) {

  const errors = app.errors;

  const websiteCtrl = app.controllers.website;

  app.get('')
};