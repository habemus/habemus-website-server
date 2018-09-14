// native
const util = require('util');

// third-party
const AMQPWorkerServer = require('@habemus/amqp-worker/server');
const Bluebird      = require('bluebird');

// own
const CONSTANTS = require('../../shared/constants');

module.exports = function (app, options) {

  function HWebsiteDeployer(options) {
    AMQPWorkerServer.call(this, options);
  }
  util.inherits(HWebsiteDeployer, AMQPWorkerServer);

  HWebsiteDeployer.prototype.workerFn = function (payload, logger) {

    console.log('deploy request received', payload);

    var projectId   = payload.projectId;
    var versionCode = payload.versionCode || null;

    if (!projectId) {
      return Bluebird.reject(new app.errors.InvalidOption('projectId', 'required'));
    }

    // get the website
    return app.controllers.website.resolveProject(projectId, versionCode)
      .then((website) => {

        return app.services.hWebsiteEventsPublisher.publish(
          CONSTANTS.WEBSITE_EVENTS.DEPLOYED,
          {
            /**
             * Pass the resolved website.
             */
            website: website,
          }
        );

      });
  };

  var hDeployer = new HWebsiteDeployer({ name: 'h-website-deployer' });

  return hDeployer.connect(app.services.rabbitMQ.connection)
    .then(() => {
      return hDeployer;
    });

};
