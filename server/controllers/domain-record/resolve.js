// third-party dependencies
const URLPattern = require('url-pattern');
const Bluebird   = require('bluebird');

// constants
const CONSTANTS = require('../../../shared/constants');

/**
 * Data format for website resolution.
 * 
 * @type {Object}
 */
const WEBSITE_MODEL = {
  signedURL: String,
  activeDomainRecords: [{
    domain: String,
    enableWwwAlias: Boolean,
  }],
};

module.exports = function (domainRecordCtrl, app, options) {

  /**
   * Authentication token used to call hProject API
   * @type {String}
   */
  const H_PROJECT_AUTH_TOKEN = options.hProjectAuthToken;

  /**
   * Pattern to match habemus' domains
   */
  const HOST_DOMAIN = options.hostDomain;
  const habemusDomainPattern = new URLPattern('(:version.):code.' + HOST_DOMAIN);

  const errors = app.errors;

  const DomainRecord = app.services.mongoose.models.DomainRecord;

  domainRecordCtrl.resolve = function (domain) {

    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    var habemusMatch = habemusDomainPattern.match(domain);

    if (habemusMatch) {
      // it is habemus domain
      return domainRecordCtrl.resolveHabemus({
        code: habemusMatch.code,
        version: habemusMatch.version,
      });
    } else {
      // custom domain
      return domainRecordCtrl.resolveCustomDomain(domain);
    }

  };

  domainRecordCtrl.resolveHabemus = function (domainData) {

    if (!domainData) {
      return Bluebird.reject(new errors.InvalidOption('domainData', 'required'));
    }

    var projectCode        = domainData.code;
    var projectVersionCode = domainData.version || null;

    return app.services.hProject
      .getByCode(H_PROJECT_AUTH_TOKEN, projectCode)
      .then((project) => {

        return Bluebird.all([
          app.services.hProject.getProjectVersion(
            H_PROJECT_AUTH_TOKEN,
            project._id,
            projectVersionCode,
            {
              distSignedURL: 'read'
            }
          ),

          // retrieve all active records associated to the project
          domainRecordCtrl.listProjectRecords(project._id, [
            CONSTANTS.RECORD_STATUSES.ACTIVE
          ]),
        ]);
      })
      .then((results) => {

        var version       = results[0];
        var activeRecords = results[1];

        return {
          signedURL: version.distSignedURL,
          activeRecords: activeRecords.map((record) => {
            return {
              domain: record.domain,
              enableWwwAlias: record.enableWwwAlias,
            };
          }),
        };
      });

  };

  domainRecordCtrl.resolveCustomDomain = function (domain) {

    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    var _record;

    return domainRecordCtrl.getByActiveDomain(domain)
      .then((record) => {
        _record = record;

        return Bluebird.all([

          // retrieve the project through h-project private api
          app.services.hProject.getProjectVersion(
            H_PROJECT_AUTH_TOKEN,
            record.projectId,
            null, // latest version
            {
              distSignedURL: 'read',
            }
          ),

          // retrieve all active records associated to the project
          domainRecordCtrl.listProjectRecords(_record.projectId, [
            CONSTANTS.RECORD_STATUSES.ACTIVE
          ]),
        ]);

      })
      .then((results) => {

        var version       = results[0];
        var activeRecords = results[1];

        return {
          signedURL: version.distSignedURL,
          activeRecords: activeRecords.map((record) => {
            return {
              domain: record.domain,
              enableWwwAlias: record.enableWwwAlias,
            };
          }),
        };
      });
  };
};
