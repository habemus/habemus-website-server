/**
 * Defines a cron job that reschedules failed domain records
 * ONLY if they are not failed permanently.
 */

// third-party
const CronJob  = require('cron').CronJob;
const Bluebird = require('bluebird');

// constants
const CONSTANTS = require('../../../shared/constants');

// at midnight
const DEFAULT_CRON_TIME = '00 00 00 * * *';

module.exports = function (app, options) {

  const DomainRecord = app.services.mongoose.models.DomainRecord;

  const CRON_TIME = options.cronDomainVerificationRescheduling || DEFAULT_CRON_TIME;

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

      // console.log('reschedule temporarily failed verifications');

      var query = {};

      DomainRecord.scopeQueryByStatuses(query, [
        CONSTANTS.RECORD_STATUSES.FAILED,
      ]);

      DomainRecord.find(query).then((records) => {

        return Bluebird.all(records.map((record) => {

          /**
           * Clear the verification results
           */
          record.resetVerificationResults();

          /**
           * Mark the record as `pending verification`
           */
          record.setStatus(
            CONSTANTS.RECORD_STATUSES.PENDING,
            'AutomaticallyRescheduled'
          );

          return record.save();
        }));

      });

    },
    start: true,
  });

  return job;
}