// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

module.exports = function (app, options) {

  const errors = app.errors;

  app.post('/domain-records'
    app.middleware.authenticate(),
    bodyParser.json(),
    app.middleware.verifyProjectPermissions({
      identifier: function (req) {
        return req.body.projectId;
      },
      permissions: ['update']
    }),
    function (req, res, next) {

    }
  );

  app.get('/domain-records',
    app.middleware.authenticate(),
    app.middleware.verifyProjectPermissions({
      identifier: function (req) {
        return req.query.projectId;
      },
      permissions: ['read']
    }),
    function (req, res, next) {

    }
  );

  app.get('/domain-record/:recordId',
    app.middleware.authenticate(),
    app.middleware.loadDomainRecord(),
    app.middleware.verifyProjectPermissions({
      identifier: function (req) {
        return req.domainRecord.projectId;
      },
      permissions: ['read']
    }),
    function (req, res, next) {

    }

  );
};
