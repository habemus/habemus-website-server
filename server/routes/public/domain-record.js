// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

module.exports = function (app, options) {

  const errors = app.errors;

  app.post('/project/:projectId/domain-records'
    app.middleware.authenticate(),
    app.middleware.verifyProjectPermissions({
      permissions: ['update']
    }),
    bodyParser.json(),
    function (req, res, next) {

    }
  );

  app.get('/project/:projectId/domain-records',
    app.middleware.authenticate(),
    app.middleware.verifyProjectPermissions({
      permissions: ['read']
    }),
    function (req, res, next) {

    }
  );

  app.get('/project/:projectId/domain-record/:recordId',
    app.middleware.authenticate(),
    app.middleware.loadDomainRecord(),
    app.middleware.verifyProjectPermissions({
      permissions: ['read']
    }),
    function (req, res, next) {

    }
  );

  app.delete('/project/:projectId/domain-record/:recordId',
    app.middleware.authenticate(),
    app.middleware.loadDomainRecord(),
    app.middleware.verifyProjectPermissions({
      permissions: ['delete']
    }),
    function (req, res, next) {

    }
  );
};
