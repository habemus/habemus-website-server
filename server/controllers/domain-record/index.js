// third-party dependencies
const Bluebird = require('bluebird');

// constants
const CONSTANTS = require('../../../shared/constants');

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
  };

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

  require('./verify')(domainRecordCtrl, app, options);

  return domainRecordCtrl;
};
