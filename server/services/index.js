// third-party
const Bluebird = require('bluebird');

module.exports = function (app, options) {

  return Bluebird.all([
    require('./log')(app, options),
    require('./mongoose')(app, options),
    require('./h-project')(app, options),
    require('./h-account')(app, options),
    require('./message-api')(app, options),
  ])
  .then((services) => {
    // ensure nothing is returned by the promise
    
    app.services = {
      log: services[0],
      mongoose: services[1],
      hProject: services[2],
      hAccount: services[3],
      messageAPI: services[4],
    };

    return;
  });
};