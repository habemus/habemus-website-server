// third-party dependencies
const Bluebird = require('bluebird');
const hDns     = require('h-dns');

// constants
const CONSTANTS = require('../../../shared/constants');

module.exports = function (domainRecordCtrl, app, options) {
  
  const errors = app.errors;

  const DomainRecord = app.services.mongoose.models.DomainRecord;

  /**
   * Restarts the verification process (modifying the `verification.expiresAt` and the
   * status to `pending-verification`)
   * 
   * @param  {DomainRecord} record
   * @param  {String} reason
   * @return {Bluebird -> DomainRecord}
   */
  domainRecordCtrl.restartVerification = function (record) {
    record.startVerification('VerificationRestarted');

    return record.save();
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
     * Code that should be on the domain's TXT dns records
     * @type {String}
     */
    var verificationCode      = record.get('verification.code');
    var verificationSubdomain = record.get('verification.subdomain');

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

      return record.save();
    })
    .then((record) => {
      // wait for the record to be saved before resolving
      // the website, so that the record may be considered active
      var status = record.getStatus();

      if (status === CONSTANTS.RECORD_STATUSES.ACTIVE) {

        // TODO: resolving during tests is throwing errors,
        // as we are not mocking it correctly.
        // study how to silence errors in tests
        app.controllers.website.resolveProject(record.projectId)
          .then((website) => {

            return app.services.hWebsiteEventsPublisher.publish(
              CONSTANTS.WEBSITE_EVENTS.DEPLOYED,
              {
                /**
                 * Pass the resolved website.
                 */
                website: website,
              }
            );

          });
      }

      // always return the record
      return record;
    });
    
  };
};
