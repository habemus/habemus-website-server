// third-party
const Bluebird = require('bluebird');

module.exports = function (app, options) {

  return Bluebird.all([
    require('./h-website-deployer')(app, options),
  ])
  .then((results) => {
    app.workers = {};

    app.workers.hWebsiteDeployer = results[0];
  });

};
