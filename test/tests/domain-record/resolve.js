const fs   = require('fs');
const path = require('path');

const should = require('should');
const Bluebird = require('bluebird');
const mongoose = require('mongoose');
const mockery  = require('mockery');

const ValidationError = mongoose.Error.ValidationError;

// auxiliary
const aux = require('../../aux');

describe('domainRecordCtrl.resolve(domain)', function () {

  var ASSETS;
  var domainRecordCtrl;

  beforeEach(function () {

    this.timeout(10000);
    
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    // mock h-project/client/private module and make it respond with the correct data
    mockery.registerMock('h-project/client/private', require('../../aux/h-project-mock'));

    // re-require the website manager app
    // after enabling mockery
    const createWebsiteManager = require('../../../server');
    
    return aux.setup()
      .then((assets) => {

        ASSETS = assets;

        var options = aux.genOptions({
          websiteHostIpAddresses: ['1.1.1.1', '0.0.0.0'],
          domainVerificationSampleSize: 5,
          domainActivationThreshold: 0.6,
          maxDomainFailureCount: 5
        });

        ASSETS.hWebsite = createWebsiteManager(options);

        return ASSETS.hWebsite.ready;

      })
      .then((hWebsite) => {

        domainRecordCtrl = hWebsite.controllers.domainRecord;

        // create some records
        return Bluebird.all([
          // project-1, active
          domainRecordCtrl.create('www.my-domain.com', {
            projectId: 'project-1-id',
            verification: {
              code: 'someverificationcode'
            }
          }),
          // project-1, not active
          domainRecordCtrl.create('another.my-domain.com', {
            projectId: 'project-1-id',
            verification: {
              code: 'someverificationcode'
            }
          }),

          // project-2, active
          domainRecordCtrl.create('yet.another.my-domain.com', {
            projectId: 'project-2-id',
            verification: {
              code: 'someverificationcode'
            }
          }),
        ]);
      })
      .then((records) => {
        ASSETS.records = records;

        // activate only 2 records of the three registered
        records[0].setStatus('active', 'TestReason');
        // records[1].setStatus('active', 'TestReason');
        records[2].setStatus('active', 'TestReason');

        return Bluebird.all([
          records[0].save(),
          records[1].save(),
          records[2].save(),
        ]);
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });

  });

  afterEach(function () {
    mockery.disable();
    
    return aux.teardown();
  });

  describe('#resolveCustomDomain(domain)', function () {
    it('should resolve to a website', function () {
      return domainRecordCtrl.resolveCustomDomain('www.my-domain.com')
        .then((website) => {
          website.signedURL.should.be.instanceof(String);
          website.activeRecords.length.should.eql(1);
          website.activeRecords[0].domain.should.be.instanceof(String);
          website.activeRecords[0].enableWwwAlias.should.eql(true);
        });
    });

    it('should return NotFound error in case the domain does not match any record', function () {
      return domainRecordCtrl.resolveCustomDomain('www.not-my-domain.com')
        .then(aux.errorExpected, (err) => {
          err.name.should.eql('NotFound');
        });
    });
  });

  describe('#resolveHabemus(domainData)', function () {

  });

  describe('#resolve(domain)', function () {
    it('should check the domain type and resolve accordingly', function () {
      return domainRecordCtrl.resolve('v1.project-2-code.habemus.xyz')
        .then((website) => {
          console.log(website);
        });
    });
    it('should check the domain type and resolve accordingly', function () {
      return domainRecordCtrl.resolve('project-2-code.habemus.xyz');
    });
  });
});
