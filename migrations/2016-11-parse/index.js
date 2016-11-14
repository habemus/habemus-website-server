// native
const path = require('path');

// third-party
const Bluebird = require('bluebird');
const log      = require('awesome-logs');

const CONSTANTS = require('../../shared/constants');

const domainRecords = require('./raw-data/DomainRecord.json').results.filter((record) => {
  return record.status_ === 'active';
});

exports.migrate = function (options) {

  if (!options.hWebsite) {
    throw new Error('hWebsite is required');
  }

  if (!options.hProject) {
    throw new Error('hProject is required');
  }

  if (!options.ipAddresses) {
    throw new Error('ipAddresses is required');
  }

  const hWebsite = options.hWebsite;
  const hProject = options.hProject;
  const ipAddresses = options.ipAddresses;

  var skippedDomainRecords  = [];
  var importedDomainRecords = [];

  return Bluebird.all([hWebsite.ready, hProject.ready]).then(() => {

    const DomainRecord = hWebsite.services.mongoose.models.DomainRecord;
    const Project = hProject.services.mongoose.models.Project;

    return domainRecords.reduce((lastPromise, sourceDomainRecord) => {

      return lastPromise.then(() => {

        log.row();
        log.info('[record-start] Started importing domain ' + sourceDomainRecord.hostname);

        // retrieve the project associated to the sourceDomainRecord
        return Project.findOne({
          'meta.parseObjectId': sourceDomainRecord.project.objectId,
        })
        .then((project) => {
          if (!project) {
            // no associated project found
            // skipping
            return false;
          }

          var domainRecord = new DomainRecord({
            projectId: project._id.toString(),
            domain: sourceDomainRecord.hostname,
            'verification.code': sourceDomainRecord.verificationCode_,
            ipAddresses: ipAddresses,
          });

          domainRecord.setStatus(
            CONSTANTS.RECORD_STATUSES.ACTIVE,
            'MigratedFromParse'
          );

          return domainRecord.save();

        })
        .then((domainRecord) => {

          if (domainRecord) {
            importedDomainRecords.push(domainRecord);
            log.alert('[record-ok] sourceDomainRecord imported ' + sourceDomainRecord.hostname);
          } else {
            skippedDomainRecords.push(sourceDomainRecord);
            log.alert('[record-skip] Could not find the corresponding project for ' + sourceDomainRecord.hostname);
          }

          log.row();

        });

      })

    }, Bluebird.resolve());
  })
  .then(() => {

    return {
      skippedDomainRecords: skippedDomainRecords,
      importedDomainRecords: importedDomainRecords,
    };

  });

};

exports.undo = function (options) {

};
