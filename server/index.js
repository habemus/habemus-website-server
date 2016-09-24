// third-party
const express = require('express');
const uuid    = require('uuid');

// own
const setupServices = require('./services');

/**
 * Function that starts the host server
 */
function hWebsite(options) {
  if (!options.apiVersion) { throw new Error('apiVersion is required'); }
  if (!options.hAuthURI) { throw new Error('hAuthURI is required'); }
  if (!options.hProjectURI) { throw new Error('hProjectURI is required'); }
  if (!options.mongodbURI) { throw new Error('mongodbURI is required'); }
  if (!options.rabbitMQURI) { throw new Error('rabbitMQURI is required'); }
  
  if (!Array.isArray(options.websiteHostIpAddresses) || options.websiteHostIpAddresses.length === 0) {
    throw new Error('websiteHostIpAddresses is required and MUST NOT be empty');
  }

  /**
   * Option that enables the private API routes.
   * @type {Boolean}
   */
  options.enablePrivateAPI = options.enablePrivateAPI || false;

  
  // create express app instance
  var app = express();

  // generate a unique id for the app
  app.id = 'h-website-manager-' + uuid.v4();

  // make constants available throughout the application
  app.constants = require('../shared/constants');

  // make the error constructors available throughout the application
  app.errors = require('../shared/errors');
  
  app.ready = setupServices(app, options).then(() => {
    
    // instantiate controllers
    app.controllers = {};
    app.controllers.domainRecord =
      require('./controllers/domain-record')(app, options);

    // instantiate middleware for usage in routes
    app.middleware = {};
    // app.middleware.authenticate =
    //   require('./middleware/authenticate').bind(null, app);
    // app.middleware.authenticatePrivateAPI =
    //   require('./middleware/authenticate-private-api').bind(null, app);
    // app.middleware.loadWebsite =
    //   require('./middleware/load-website').bind(null, app);
    // app.middleware.verifyWebsitePermissions =
    //   require('./middleware/verify-website-permissions').bind(null, app);
    // app.middleware.uploadToWebsiteStorage =
    //   require('./middleware/upload-to-website-storage').bind(null, app);
    
    // define description route
    // app.get('/hello', function (req, res) {
    //   var msg = app.services.messageAPI.item({
    //     name: 'h-website',
    //     id: app.id,
    //   }, { name: true });

    //   res.json(msg);
    // });
  
    // load routes
    // require('./routes/website')(app, options);

    if (options.enablePrivateAPI) {

      if (!options.privateAPISecret) {
        throw new Error('privateAPISecret is required to enablePrivateAPI');
      }

      require('./routes/private-api')(app, options);
    }
  
    // load error-handlers
    // require('./error-handlers/h-website-manager-errors')(app, options);
    // require('./error-handlers/mongoose-validation-error')(app, options);
  
    // load cron jobs and start them
    // app.cron = {};
    // app.cron.domainVerification = require('./cron/domain-verification')(app, options);
    // app.cron.domainVerification.start();
    
    return app;
  });

  return app;
}

module.exports = hWebsite;