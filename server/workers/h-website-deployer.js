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

  HWebsiteDeployer.prototype.workerFn = function (project, logger) {

    console.log('deploy request received', project);

    if (!project._id) {
      return Bluebird.reject(new app.errors.InvalidOption('project._id', 'required'));
    }

    var projectId = project._id;
    var projectVersionCode = project.versionCode || null;

    // get the website
    return app.controllers.website.resolveProject(projectId, projectVersionCode)
      .then((website) => {

        return app.services.hWebsiteEventsPublisher.publish('updated', {
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
