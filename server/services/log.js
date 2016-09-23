// third-party
const Bluebird = require('bluebird');
const bunyan   = require('bunyan');

module.exports = function (app, options) {
  
  return new Bluebird((resolve, reject) => {
    resolve(bunyan.createLogger({
      name: 'h-website',
    }));
  });
};
