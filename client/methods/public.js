// own
const errors = require('../../shared/errors');

exports.createDomainRecord = function (authToken, projectId, recordData) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!projectId) {
    return Bluebird.reject(new errors.InvalidOption('projectId', 'required', 'projectId is required'));
  }

  return this._authReq(
    'POST',
    '/website/' + projectId + '/domain-records',
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
    '/website/' + projectId + '/domain-record/' + recordId,
    {
      authToken: authToken,
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
    '/website/' + projectId + '/domain-records',
    {
      authToken: authToken,
    }
  );
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
    '/website/' + projectId + '/domain-record/' + recordId,
    {
      authToken: authToken,
    }
  );
};
