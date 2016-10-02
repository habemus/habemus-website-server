// third-party
const Bluebird   = require('bluebird');
const superagent = require('superagent');

exports._authReq = function (method, path, options) {

  method = method.toLowerCase();

  var URL = this.serverURI + path;

  return new Bluebird((resolve, reject) => {
    var req = superagent[method](URL);

    req = req.set('Authorization', 'Bearer ' + options.authToken);

    if (options.send) {
      req = req.send(options.send);
    }

    if (options.query) {
      req = req.query(options.query);
    }

    req.end((err, res) => {
      if (err) {
        if (res && res.body && res.body.error) {
          reject(res.body.error);
        } else {
          reject(err);
        }
      } else {
        if (res && res.body && res.body.data) {
          resolve(res.body.data);
        } else {
          resolve();
        }
      }
    });
  });

};
