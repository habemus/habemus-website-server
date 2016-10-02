// third-party
const Bluebird = require('bluebird');

module.exports = function (app, options) {

  return Bluebird.all([
    require('./h-deployer')(app, options),
  ])
  .then((results) => {
    app.workers = {};

    app.workers.hDeployer = results[0];
  });

};
