// third-party
const express = require('express');

module.exports = function (app, options) {

  var privateApp = express();

  // expose app's properties
  privateApp.constants   = app.constants;
  privateApp.errors      = app.errors;
  privateApp.controllers = app.controllers;
  privateApp.middleware  = app.middleware;
  privateApp.services    = app.services;

  require('./website')(privateApp, options);

  // mount the private app onto the private route
  app.use('/_',
    app.middleware.authenticatePrivate(options),
    privateApp
  );
};
