// third-party dependencies
const Bluebird = require('bluebird');
const hDns     = require('h-dns');
const clone    = require('clone');

// constants
const CONSTANTS = require('../../shared/constants');

module.exports = function (app, options) {

  /**
   * List of IP Addresses from which the
   * websites will be hosted from.
   * @type {Array}
   */
  const IP_ADDRESSES = options.websiteHostIpAddresses;

  const errors = app.errors;

  const DomainRecord = app.services.mongoose.models.DomainRecord;
  
  var domainRecordCtrl = {};

  /**
   * Creates a new domain record
   * @param  {String} domain
   * @param  {Object} recordData
   * @return {Bluebird -> DomainRecord}
   */
  domainRecordCtrl.create = function (domain, recordData) {
    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    var domainRecord = new DomainRecord(recordData);
    
    domainRecord.set('domain', domain);

    domainRecord.set('ipAddresses', IP_ADDRESSES);

    domainRecord.setStatus('pending-verification', 'UserCreated');

    return domainRecord.save();
  };

  /**
   * Retrieves a domain record by its _id
   * 
   * @param  {String} recordId
   * @return {Bluebird -> DomainRecord}
   */
  domainRecordCtrl.getById = function (recordId) {
    return DomainRecord.findOne({
      _id: recordId
    })
    .then((record) => {
      if (!record) {
        return Bluebird.reject(new errors.NotFound('domainRecord', recordId));
      } else {
        return record;
      }
    })
  };

  /**
   * Retrieves a domain record with status at 'active'
   * with the given domain.
   * 
   * @param  {String} domain
   * @return {Bluebird -> DomainRecord}
   */
  domainRecordCtrl.getByActiveDomain = function (domain) {

    if (!domain) {
      return Bluebird.reject(new errors.InvalidOption('domain', 'required'));
    }

    // normalize the domain to the version without
    // leading 'www'
    domain = DomainRecord.stripWww(domain);

    var query = { domain: domain };

    DomainRecord.scopeQueryByStatuses(query, [
      CONSTANTS.RECORD_STATUSES.ACTIVE
    ]);

    return DomainRecord.findOne(query).then((record) => {
      if (!record) {
        return Bluebird.reject(new errors.NotFound('domainRecord', domain));
      } else {
        return record;
      }
    });
  }

  /**
   * Retrieves a list of active domain records associated to
   * the project.
   * 
   * @param  {String} projectId
   * @param  {Array} statuses
   * @return {Bluebird -> Array[DomainRecord]}
   */
  domainRecordCtrl.listProjectRecords = function (projectId, statuses) {

    var query = { projectId: projectId };

    if (statuses) {
      DomainRecord.scopeQueryByStatuses(query, statuses);
    }

    return DomainRecord.find(query);
  };

  /**
   * Executes the record verification process.
   * 
   * @param  {DomainRecord} record
   * @return {Bluebird -> DomainRecord}
   */
  domainRecordCtrl.verify = function (record) {

    if (!(record instanceof DomainRecord)) {
      return Bluebird.reject(new errors.InvalidOption('record', 'required'));
    }

    /**
     * The domain that is to be verified.
     * @type {String}
     */
    var domain = record.get('domain');

    /**
     * Addresses at which the domain's contents are hosted.
     * @type {Array}
     */
    var targetIPAddresses = record.get('ipAddresses');

    /**
     * Whether to enable the www alias.
     * @type {Boolean}
     */
    var enableWwwAlias = record.get('enableWwwAlias');

    /**
     * Code that should be on the domain's TXT dns records
     * @type {String}
     */
    var verificationCode      = record.get('verification.code');
    var verificationSubdomain = record.get('verification.detail.subdomain');

    var verificationDomain = verificationSubdomain + '.' + domain;

    return Bluebird.all([
      hDns.resolveIpv4Diff(domain, targetIPAddresses),
      hDns.resolveCnameDiff('www.' + domain, domain),
      hDns.resolveTxtDiff(verificationDomain, verificationCode)
    ])
    .then((results) => {
      /**
       * Save the verification result to the record.
       */
      record.addVerificationResult({
        ipv4Diff: results[0],
        cnameDiff: results[1],
        txtDiff: results[2],
      });

      var status = record.getStatus();

      // if (status === CONSTANTS.RECORD_STATUSES.ACTIVE) {
      //   app.controllers.website.getById(record.projectId)
      //     .then((website) => {
      //       app.controllers.event.publishWebsiteUpdated(website);
      //     });
      // }

      return record.save();
    });
    
  };

  return domainRecordCtrl;
};
