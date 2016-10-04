exports.resolve = function (authToken, domain) {
  if (!authToken) { return Bluebird.reject(new errors.Unauthorized()); }

  if (!domain) {
    return Bluebird.reject(new errors.InvalidOption('domain', 'required', 'domain is required'));
  }

  return this._authReq(
    'POST',
    '/website/' + domain + '/resolve',
    {
      authToken: authToken,
    }
  );
};
