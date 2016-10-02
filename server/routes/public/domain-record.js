// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

const RECORD_DATA = {
  _id: true,
  domain: true,
  enableWwwAlias: true,
  'status.value': true,
  'status.updatedAt': true,
  'verification.code': true,
  'verification.method': true,
  'verification.detail': true,
};

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
          var msg = app.services.messageAPI.item(record, RECORD_DATA);
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
        app.constants.VALID_RECORD_STATUSES
      )
      .then((records) => {

        var msg = app.services.messageAPI.list(records, RECORD_DATA);
        res.json(msg);
      })
      .catch(next);

    }
  );

  // app.get('/project/:projectId/domain-record/:recordId',
  //   app.middleware.authenticate(authenticateOptions),
  //   app.middleware.loadDomainRecord(),
  //   app.middleware.verifyProjectPermissions({
  //     permissions: ['read']
  //   }),
  //   function (req, res, next) {

  //   }
  // );

  // app.delete('/project/:projectId/domain-record/:recordId',
  //   app.middleware.authenticate(authenticateOptions),
  //   app.middleware.loadDomainRecord(),
  //   app.middleware.verifyProjectPermissions({
  //     permissions: ['delete']
  //   }),
  //   function (req, res, next) {

  //   }
  // );
};
