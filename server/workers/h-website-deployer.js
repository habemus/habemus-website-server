// native
const util = require('util');

// third-party
const HWorkerServer = require('h-worker/server');
const Bluebird      = require('bluebird');

module.exports = function (app, options) {

  function HWebsiteDeployer(options) {
    HWorkerServer.call(this, options);
  }
  util.inherits(HWebsiteDeployer, HWorkerServer);

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

        return app.services.hWebsiteEventsPublisher.publish('deployed', {
          /**
           * Pass the resolved website.
           */
          website: website,
        });

      });
  };


  var hDeployer = new HWebsiteDeployer({ name: 'h-website-deployer' });

  return hDeployer.connect(app.services.rabbitMQ.connection)
    .then(() => {
      return hDeployer;
    });

};
