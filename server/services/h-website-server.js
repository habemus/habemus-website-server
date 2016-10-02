// third-party
const Bluebird = require('bluebird');

const PrivateHWebsiteServer = require('h-website-server/client/private');

module.exports = function (app, options) {

  var hWebsiteServerClient = new PrivateHWebsiteServer({
    websiteEventsExchange: options.websiteEventsExchange,
  });
  
  return hWebsiteServerClient.connectRabbitMQ(app.services.rabbitMQ.connection)
    .then(() => {
      return hWebsiteServerClient;
    });
};
