const fs   = require('fs');
const path = require('path');

const should = require('should');
const Bluebird = require('bluebird');
const mongoose = require('mongoose');
const mockery  = require('mockery');

const ValidationError = mongoose.Error.ValidationError;

// auxiliary
const aux = require('../../aux');

describe('domainRecordCtrl.verify(record)', function () {

  var ASSETS;
  var domainRecordCtrl;

  var dnsMockResults = {};

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

        if (!dnsMockResults.resolveCname) {
          throw new Error('dnsMockResults undefined for resolveCname');
        }

        cb(null, dnsMockResults.resolveCname);
      },
      resolve4: function (hostname, cb) {

        if (!dnsMockResults.resolve4) {
          throw new Error('dnsMockResults undefined for resolve4');
        }

        cb(null, dnsMockResults.resolve4);
      },
      resolveTxt: function (hostname, cb) {

        if (!dnsMockResults.resolveTxt) {
          throw new Error('dnsMockResults undefined for resolveTxt');
        }

        cb(null, dnsMockResults.resolveTxt);
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

    /**
     * Reset mock results
     * @type {Object}
     */
    dnsMockResults = {};
    
    return aux.teardown();
  });

  it('should progressively verify the status and compute the results', function () {

    /**
     * Set successful mock results
     * @type {Array}
     */
    dnsMockResults.resolveCname = ['habemus.xyz'];
    dnsMockResults.resolve4     = ['1.1.1.1', '0.0.0.0'];
    dnsMockResults.resolveTxt   = [['someverificationcode']];

    // 1
    return domainRecordCtrl.verify(ASSETS.record)
      .then((record) => {
        // 2
        return domainRecordCtrl.verify(record);
      })
      .then((record) => {

        var verificationScores = record.verificationScores;

        // verification threshold reached but sampleSize not
        verificationScores.cnameScore.should.equal(1);
        verificationScores.txtScore.should.equal(1);
        verificationScores.ipv4Score.should.equal(1);
        record.getStatus().should.equal('verifying');

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

        var verificationScores = record.verificationScores;

        verificationScores.cnameScore.should.equal(1);
        verificationScores.txtScore.should.equal(1);
        verificationScores.ipv4Score.should.equal(1);
        record.getStatus().should.equal('active');
      });
  });
});
