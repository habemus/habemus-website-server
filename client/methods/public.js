// third-party
const Bluebird = require('bluebird');

// own
const errors = require('../../shared/errors');

exports.createDomainRecord = function (authToken, projectId, recordData) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!projectId) {
    return Bluebird.reject(new errors.InvalidOption('projectId', 'required', 'projectId is required'));
  }

  return this._authReq(
    'POST',
    '/project/' + projectId + '/domain-records',
    {
      authToken: authToken,
      send: recordData,
    }
  );
};

exports.getDomainRecord = function (authToken, projectId, recordId) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!projectId) {
    return Bluebird.reject(new errors.InvalidOption('projectId', 'required', 'projectId is required'));
  }

  if (!recordId) {
    return Bluebird.reject(new errors.InvalidOption('recordId', 'required', 'recordId is required'));
  }

  return this._authReq(
    'GET',
    '/project/' + projectId + '/domain-record/' + recordId,
    {
      authToken: authToken,
    }
  );
};

exports.verifyDomainRecord = function (authToken, projectId, recordId) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!projectId) {
    return Bluebird.reject(new errors.InvalidOption('projectId', 'required', 'projectId is required'));
  }

  if (!recordId) {
    return Bluebird.reject(new errors.InvalidOption('recordId', 'required', 'recordId is required'));
  }

  return this._authReq(
    'POST',
    '/project/' + projectId + '/domain-record/' + recordId + '/verify',
    {
      authToken: authToken
    }
  );
};

exports.listDomainRecords = function (authToken, projectId) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!projectId) {
    return Bluebird.reject(new errors.InvalidOption('projectId', 'required', 'projectId is required'));
  }

  return this._authReq(
    'GET',
    '/project/' + projectId + '/domain-records',
    {
      authToken: authToken,
    }
  )
  .then(function (data) {
    return data.items;
  });
};

exports.deleteDomainRecord = function (authToken, projectId, recordId) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!projectId) {
    return Bluebird.reject(new errors.InvalidOption('projectId', 'required', 'projectId is required'));
  }

  if (!recordId) {
    return Bluebird.reject(new errors.InvalidOption('recordId', 'required', 'recordId is required'));
  }

  return this._authReq(
    'DELETE',
    '/project/' + projectId + '/domain-record/' + recordId,
    {
      authToken: authToken,
    }
  );
};
