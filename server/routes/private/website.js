// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

const interfaces = require('../interfaces');

module.exports = function (app, options) {

  const errors = app.errors;

  const websiteCtrl = app.controllers.website;

  app.get('/website/:domain/resolve',
    function (req, res, next) {

      var domain = req.params.domain;

      app.controllers.website.resolve(domain)
        .then((website) => {

          var msg = app.services.messageAPI.item(website, interfaces.WEBSITE_DATA);
          res.json(msg);

        })
        .catch(next);
    }
  );
};
