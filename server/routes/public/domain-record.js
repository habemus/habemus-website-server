// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

const interfaces = require('../interfaces');

module.exports = function (app, options) {

  const errors = app.errors;

  const authenticateOptions = {
    hAccountToken: options.hAccountToken
  };

  app.post('/project/:projectId/domain-records',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      permissions: ['update'],
      hProjectToken: options.hProjectToken,
    }),
    bodyParser.json(),
    function (req, res, next) {

      var projectId = req.params.projectId;
      var domain    = req.body.domain;

      var recordData = {
        enableWwwAlias: req.body.enableWwwAlias,
      };

      app.controllers.domainRecord.create(projectId, domain, recordData)
        .then((record) => {
          var msg = app.services.messageAPI.item(record, interfaces.RECORD_DATA);
          res.json(msg);
        })
        .catch(next);

    }
  );

  app.get('/project/:projectId/domain-records',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      permissions: ['read'],
      hProjectToken: options.hProjectToken,
    }),
    function (req, res, next) {

      app.controllers.domainRecord.listProjectRecords(
        req.params.projectId,
        [
          app.constants.RECORD_STATUSES.PENDING,
          app.constants.RECORD_STATUSES.ACTIVE,
          app.constants.RECORD_STATUSES.VERIFYING,
          app.constants.RECORD_STATUSES.FAILED,
          app.constants.RECORD_STATUSES.FAILED_PERMANENTLY,
        ]
      )
      .then((records) => {

        var msg = app.services.messageAPI.list(records, interfaces.RECORD_DATA);
        res.json(msg);
      })
      .catch(next);

    }
  );

  app.post('/project/:projectId/domain-record/:recordId/verify',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      permissions: ['read', 'update'],
      hProjectToken: options.hProjectToken,
    }),
    app.middleware.loadDomainRecord(),
    function (req, res, next) {

      return app.controllers.domainRecord.verify(req.domainRecord)
        .then((record) => {

          var msg = app.services.messageAPI.item(record, interfaces.RECORD_DATA);
          res.json(msg);
        })
        .catch(next);
    }
  );

  app.get('/project/:projectId/domain-record/:recordId',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      permissions: ['read'],
      hProjectToken: options.hProjectToken,
    }),
    app.middleware.loadDomainRecord(),
    function (req, res, next) {

      var msg = app.services.messageAPI.item(req.domainRecord, interfaces.RECORD_DATA);
      res.json(msg);
      
    }
  );

  app.delete('/project/:projectId/domain-record/:recordId',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      permissions: ['delete'],
      hProjectToken: options.hProjectToken,
    }),
    app.middleware.loadDomainRecord(),
    function (req, res, next) {

      app.controllers.domainRecord.scheduleRemoval(req.domainRecord, 'UserRequested')
        .then(() => {
          res.status(204).end();
        })
        .catch(next);

    }
  );
};
