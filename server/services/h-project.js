// third-party
const Bluebird = require('bluebird');

const HProjectClientPrivate = require('h-project/client/private');

module.exports = function (app, options) {
  
  return new Bluebird((resolve, reject) => {
    resolve(new HProjectClientPrivate({
      serverURI: options.hProjectURI,
    }));
  });
};
