// third-party
const AMQPEventsPublisher = require('@habemus/amqp-events/publisher');

module.exports = function (app, options) {

  var hWebsiteEventsPublisher = new AMQPEventsPublisher({
    name: 'website-events',
  });
  
  return hWebsiteEventsPublisher.connect(app.services.rabbitMQ.connection)
    .then(() => {
      return hWebsiteEventsPublisher;
    });
};
