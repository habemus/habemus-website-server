// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

const WEBSITE_DATA = {
  _id: true,
  signedURL: true,
  activeRecords: true,
  'billingStatus.value': true,
};

module.exports = function (app, options) {

  const errors = app.errors;

  const websiteCtrl = app.controllers.website;

  app.get('/_/website/:domain/resolve',
    function (req, res, next) {

      var domain = req.params.domain;

      app.controllers.website.resolve(domain)
        .then((website) => {

          var msg = app.services.messageAPI.item(website, WEBSITE_DATA);
          res.json(msg);

        })
        .catch(next);
    }
  );
};
