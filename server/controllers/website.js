// third-party dependencies
const URLPattern = require('url-pattern');
const Bluebird   = require('bluebird');

// constants
const CONSTANTS = require('../../shared/constants');

/**
 * Data format for website resolution.
 * 
 * @type {Object}
 */
const WEBSITE_MODEL = {
  _id: String,
  signedURL: String,
  activeDomainRecords: [{
    domain: String,
    enableWwwAlias: Boolean,
  }],
};

module.exports = function (app, options) {

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

  var websiteCtrl = {};

  websiteCtrl.resolve = function (domain) {

    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    var habemusMatch = habemusDomainPattern.match(domain);

    if (habemusMatch) {
      // it is habemus domain
      return websiteCtrl.resolveHabemus({
        code: habemusMatch.code,
        version: habemusMatch.version,
      });
    } else {
      // custom domain
      return websiteCtrl.resolveCustomDomain(domain);
    }

  };

  /**
   * Takes a domain (string) or domainData object 
   * and resolves to the correct website.
   * 
   * @param  {String|Object} domain
   * @return {Bluebird -> Website}
   */
  websiteCtrl.resolveHabemus = function (domain) {

    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    // if the domain is a string, it needs to be matched against
    // otherwise, assume it is an object in the format
    // {
    //   code: String,
    //   version: String
    // }
    domainData = typeof domain === 'string' ?
      habemusDomainPattern.match(domain) : domain;

    if (!domainData) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'invalid'));
    }

    var projectCode        = domainData.code;
    var projectVersionCode = domainData.version || null;
    // var _projectId;

    return app.services.hProject
      .getByCode(H_PROJECT_AUTH_TOKEN, projectCode)
      .then((project) => {
        return websiteCtrl.resolveProject(project._id, projectVersionCode);
      });
  };

  websiteCtrl.resolveCustomDomain = function (domain) {

    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    return app.controllers.domainRecord.getByActiveDomain(domain)
      .then((record) => {
        return websiteCtrl.resolveProject(record.projectId, null);
      });
  };

  /**
   * Resolves the website for the given projectId
   * and projectVersionCode
   * 
   * @param  {String} projectId
   * @param  {String} projectVersionCode
   * @return {Bluebird -> Website}
   */
  websiteCtrl.resolveProject = function (projectId, projectVersionCode) {

    if (!projectId) {
      return Bluebird.reject(new errors.InvalidOption('projectId', 'required'));
    }

    // defaults to `null` which means 'latest'
    projectVersionCode = projectVersionCode || null;

    // promise for the projectVersion retrieval
    var projectVersionPromise = app.services.hProject.getProjectVersion(
      H_PROJECT_AUTH_TOKEN,
      projectId,
      projectVersionCode,
      {
        distSignedURL: 'read'
      }
    );

    // promise for active records retrieval
    // if there is a projectVersionCode, no active
    // records should be retrieved, as versioning
    // is exclusive to the habemus url.
    var activeRecordsPromise;

    if (!projectVersionCode) {
      activeRecordsPromise = app.controllers.domainRecord.listProjectRecords(projectId, [
        CONSTANTS.RECORD_STATUSES.ACTIVE
      ]);
    } else {
      activeRecordsPromise = [];
    }

    return Bluebird.all([
      projectVersionPromise,
      activeRecordsPromise
    ])
    .then((results) => {

      var version       = results[0];
      var activeRecords = results[1];

      return {
        _id: projectId,
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

  return websiteCtrl;
};
