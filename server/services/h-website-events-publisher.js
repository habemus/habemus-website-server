// third-party
const HMQEventsPublisher = require('h-mq-events/publisher');

module.exports = function (app, options) {

  var hWebsiteEventsPublisher = new HMQEventsPublisher({
    name: 'website-events',
  });
  
  return hWebsiteEventsPublisher.connect(app.services.rabbitMQ.connection)
    .then(() => {
      return hWebsiteEventsPublisher;
    });
};
