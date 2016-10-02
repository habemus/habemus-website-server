// third-party dependencies
const cors         = require('cors');
const urlWhitelist = require('@habemus/url-whitelist');

module.exports = function (app, options) {

  var WHITELIST = options.corsWhitelist || [];

  var isOriginWhitelisted = urlWhitelist(WHITELIST);

  return cors({
    origin: function (origin, cb) {
      var whitelisted = isOriginWhitelisted(origin);

      if (!whitelisted) {
        console.warn('request from not-whitelisted origin %s', origin);
      }

      cb(null, whitelisted);
    }
  });

};
