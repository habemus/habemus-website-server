// native
const util = require('util');

// third-party
const HWorkerServer = require('h-worker/server');
const Bluebird      = require('bluebird');

module.exports = function (app, options) {

  function HDeployer(options) {
    HWorkerServer.call(this, options);
  }
  util.inherits(HDeployer, HWorkerServer);

  HDeployer.prototype.workerFn = function (project, logger) {

    if (!project._id) {
      return Bluebird.reject(new app.errors.InvalidOption('project._id', 'required'));
    }

    var projectId = project._id;
    var projectVersionCode = project.versionCode || null;

    // get the website
    return app.controllers.website.resolve(projectId, projectVersionCode)
      .then((website) => {

      });
  };


  var hDeployer = new HDeployer();

  return hDeployer.connect(app.services.rabbitMQ.connection)
    .then(() => {
      return hDeployer;
    });

};
