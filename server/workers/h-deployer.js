// native
const util = require('util');

// third-party
const HWorkerServer = require('h-worker/server');

module.exports = function (app, options) {

  function HDeployer(options) {
    HWorkerServer.call(this, options);
  }
  util.inherits(HDeployer, HWorkerServer);

  HDeployer.prototype.workerFn = function (project, logger) {

    // get the website
    return app.controllers.domainRecord
      .listProjectRecords(project._id, ['active'])
      .then((activeRecords) => {

      });

  };


  var hDeployer = new HDeployer();

  return hDeployer.connect(app.services.rabbitMQ.connection)
    .then(() => {
      return hDeployer;
    });

};
