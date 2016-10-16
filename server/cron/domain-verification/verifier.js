/**
 * Defines a cron job that verifies domain records.
 * Only verifies records at 'pending-verification' and 'verifying' statuses.
 *
 * Failed domain verifications MUST be rescheduled by the other job.
 */

// third-party
const CronJob  = require('cron').CronJob;
const Bluebird = require('bluebird');

// constants
const CONSTANTS = require('../../../shared/constants');

// every 5 minutes
const DEFAULT_CRON_TIME = '00 0,5,10,15,20,25,30,35,40,45,50,55 * * * *';

module.exports = function (app, options) {

  const DomainRecord = app.services.mongoose.models.DomainRecord;

  const CRON_TIME = options.cronDomainVerifier || DEFAULT_CRON_TIME;

  /**
   * Auxiliary function that loads a set of records to be verified
   * 
   * @return {Bluebird -> Array}
   */
  function _loadRecordsToBeVerified() {

    var query = {};

    DomainRecord.scopeQueryByStatuses(query, [
      CONSTANTS.RECORD_STATUSES.PENDING,
      CONSTANTS.RECORD_STATUSES.VERIFYING,
    ]);

    return DomainRecord
      .find(query)
      // cap at 30 the number of records to be verified at once
      .limit(30);
  }

  /**
   * Verifies a batch of records
   * @param  {Array} records
   * @return {Bluebird -> undefined}
   */
  function _verifyRecords(records) {

    // console.log('verify records', records);

    return Bluebird.all(records.map((record) => {
      return app.controllers.domainRecord.verify(record);
    }))
    .then((records) => {

      // console.log('verification results', records);

      return;
    });
  }

  /**
   * Seconds: 0-59
   * Minutes: 0-59
   * Hours: 0-23
   * Day of Month: 1-31
   * Months: 0-11
   * Day of Week: 0-6
   */
  var job = new CronJob({
    // run
    cronTime: CRON_TIME,
    // cronTime: '0,10,20,30,40,50 * * * * *',
    onTick: function() {
      _loadRecordsToBeVerified().then(_verifyRecords);
    },
    start: true,
  });

  return job;
}