// third-party
const express = require('express');
const uuid    = require('uuid');

// own
const setupServices = require('./services');

/**
 * Function that starts the host server
 */
function hWebsite(options) {
  if (!options.apiVersion)    { throw new Error('apiVersion is required'); }
  if (!options.hostDomain)    { throw new Error('hostDomain is required'); }
  if (!options.hAccountURI)   { throw new Error('hAccountURI is required'); }
  if (!options.hAccountToken) { throw new Error('hAccountToken is required'); }
  if (!options.hProjectURI)   { throw new Error('hProjectURI is required'); }
  if (!options.hProjectToken) { throw new Error('hProjectToken id required'); }
  if (!options.mongodbURI)    { throw new Error('mongodbURI is required'); }
  if (!options.rabbitMQURI)   { throw new Error('rabbitMQURI is required'); }
  
  if (!Array.isArray(options.websiteServerIpAddresses) || options.websiteServerIpAddresses.length === 0) {
    throw new Error('websiteServerIpAddresses is required and MUST NOT be empty');
  }

  if (!options.cronDomainVerifier) {
    console.warn('cronDomainVerifier not defined, falling back to using default one');
  }

  if (!options.cronDomainVerificationScheduler) {
    console.warn('cronDomainVerificationScheduler not defined, falling back to using default one');
  }

  if (!options.domainVerificationSampleSize) {
    console.warn('domainVerificationSampleSize not defined, falling back to using default one (10)');
  }

  if (!options.domainActivationThreshold) {
    console.warn('domainActivationThreshold not defined, falling back to using default one (0.6)');
  }

  if (!options.domainVerificationExpiresIn) {
    console.warn('domainVerificationExpiresIn not defined, falling back to using default one (48h)');
  }

  /**
   * Option that enables the private API routes.
   * @type {Boolean}
   */
  options.enablePrivateAPI = options.enablePrivateAPI || false;

  
  // create express app instance
  var app = express();

  // generate a unique id for the app
  app.id = 'h-website-' + uuid.v4();

  // make constants available throughout the application
  app.constants = require('../shared/constants');

  // make the error constructors available throughout the application
  app.errors = require('../shared/errors');
  
  app.ready = setupServices(app, options).then(() => {
    
    // instantiate controllers
    app.controllers = {};
    app.controllers.domainRecord =
      require('./controllers/domain-record')(app, options);
    app.controllers.website =
      require('./controllers/website')(app, options);

    // instantiate middleware for usage in routes
    app.middleware = {};
    app.middleware.cors =
      require('./middleware/cors').bind(null, app);
    app.middleware.authenticate =
      require('./middleware/authenticate').bind(null, app);
    app.middleware.authenticatePrivate =
      require('./middleware/authenticate-private').bind(null, app);
    app.middleware.verifyProjectPermissions =
      require('./middleware/verify-project-permissions').bind(null, app);
    app.middleware.loadDomainRecord =
      require('./middleware/load-domain-record').bind(null, app);
    
    // define description route
    // app.get('/hello', function (req, res) {
    //   var msg = app.services.messageAPI.item({
    //     name: 'h-website',
    //     id: app.id,
    //   }, { name: true });

    //   res.json(msg);
    // });
  
    // load routes
    require('./routes/public')(app, options);

    if (options.enablePrivateAPI) {

      if (!options.privateAPISecret) {
        throw new Error('privateAPISecret is required to enablePrivateAPI');
      }

      require('./routes/private')(app, options);
    }
  
    // load error-handlers
    require('./error-handlers/h-website-errors')(app, options);
    // require('./error-handlers/mongoose-validation-error')(app, options);
  
    // load cron jobs and start them
    app.cron = {};
    app.cron.domainVerification = require('./cron/domain-verification')(app, options);
    app.cron.domainVerification.start();
    
    // setup workers
    return require('./workers')(app, options);
  })
  .then(() => {
    return app;
  });

  return app;
}

module.exports = hWebsite;