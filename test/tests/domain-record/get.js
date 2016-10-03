const fs   = require('fs');
const path = require('path');

const should = require('should');
const Bluebird = require('bluebird');
const mongoose = require('mongoose');
const mockery  = require('mockery');

const ValidationError = mongoose.Error.ValidationError;

// auxiliary
const aux = require('../../aux');

describe('domainRecordCtrl - get methods', function () {

  var ASSETS;
  var domainRecordCtrl;

  beforeEach(function () {

    this.timeout(10000);
    
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    // mock dns module and make it respond with the correct data
    var dnsMock = {
      resolveCname: function (hostname, cb) {
        cb(null, [
          'habemus.xyz'
        ]);
      },
      resolve4: function (hostname, cb) {
        cb(null, ['1.1.1.1', '0.0.0.0']);
      },
      resolveTxt: function (hostname, cb) {
        cb(null, [
          ['someverificationcode'],
        ]);
      },
    };
    mockery.registerMock('dns', dnsMock);

    // re-require the website manager app
    // after enabling mockery
    const createWebsiteManager = require('../../../server');
    
    return aux.setup()
      .then((assets) => {

        ASSETS = assets;

        var options = aux.genOptions({
          websiteServerIpAddresses: ['1.1.1.1', '0.0.0.0'],
          domainVerificationSampleSize: 5,
          domainActivationThreshold: 0.6,
          maxDomainFailureCount: 5
        });

        ASSETS.websiteApp = createWebsiteManager(options);

        return ASSETS.websiteApp.ready;

      })
      .then((websiteApp) => {
        domainRecordCtrl = websiteApp.controllers.domainRecord;

        return domainRecordCtrl.create('project-1', 'www.habemus.xyz', {
          verification: {
            code: 'someverificationcode'
          }
        })
      })
      .then((record) => {
        ASSETS.record = record;
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

  describe('#getById(recordId)', function () {
    it('should retrieve a record by its _id attribute', function () {
      return domainRecordCtrl.getById(ASSETS.record._id)
        .then((record) => {
          record.domain.should.equal('habemus.xyz');
        })
    });
  });

  describe('#listProjectRecords(projectId, statuses)', function () {

    it('should list all DomainRecords associated to a given website', function () {

      return Bluebird.all([
        domainRecordCtrl.create('project-2', 'www.test.habemus.xyz'),
        domainRecordCtrl.create('project-2', 'www.another-test.habemus.xyz'),
        domainRecordCtrl.create('project-3', 'www.other.habemus.xyz')
      ])
      .then(() => {
        return domainRecordCtrl.listProjectRecords('project-2');
      })
      .then((records) => {
        records.length.should.equal(2);

        records.forEach((record) => {
          record.projectId.should.equal('project-2');
        });
      });
    });

    it('should allow scoping list to a given set of statuses', function () {
      return Bluebird.all([
        domainRecordCtrl.create('project-2', 'www.test.habemus.xyz'),
        domainRecordCtrl.create('project-2', 'www.another-test.habemus.xyz'),
        domainRecordCtrl.create('project-3', 'www.other.habemus.xyz')
      ])
      .then((records) => {
        return domainRecordCtrl.listProjectRecords('project-2', 'active');
      })
      .then((records) => {
        records.length.should.equal(0);
      });
    });
  });

  describe('#getByActiveDomain(domain)', function () {

    it('should retrieve a record that has the given domain and whose status is at `active`', function () {
      // 1
      return domainRecordCtrl.verify(ASSETS.record)
        .then((record) => {
          // 2
          return domainRecordCtrl.verify(record);
        })
        .then((record) => {
          // 3
          return domainRecordCtrl.verify(record);
        })
        .then((record) => {
          // 4
          return domainRecordCtrl.verify(record);
        })
        .then((record) => {
          // 5
          return domainRecordCtrl.verify(record);
        })
        .then((record) => {
          return domainRecordCtrl.getByActiveDomain('www.habemus.xyz');

        })
        .then((activeRecord) => {

          // the domain should not have the leading www
          activeRecord.domain.should.eql('habemus.xyz');

        });

    });

  });

});
