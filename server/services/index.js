// third-party
const Bluebird = require('bluebird');

module.exports = function (app, options) {

  return Bluebird.all([
    require('./log')(app, options),
    require('./mongoose')(app, options),
    require('./h-project')(app, options),
    require('./h-account')(app, options),
    require('./message-api')(app, options),
    require('./rabbit-mq')(app, options),
  ])
  .then((services) => {

    app.services = {};
    
    app.services.log = services[0];
    app.services.mongoose = services[1];
    app.services.hProject = services[2];
    app.services.hAccount = services[3];
    app.services.messageAPI = services[4];
    app.services.rabbitMQ = services[5];

    // setup second batch of services
    return Bluebird.all([
      require('./h-website-events-publisher')(app, options),
    ]);
  })
  .then((services) => {

    app.services.hWebsiteEventsPublisher = services[0];

    return;
  });
};