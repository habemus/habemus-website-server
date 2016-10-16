const fs   = require('fs');
const path = require('path');

const should = require('should');
const Bluebird = require('bluebird');
const mongoose = require('mongoose');
const mockery  = require('mockery');
const clone    = require('clone');

const ValidationError = mongoose.Error.ValidationError;

// auxiliary
const aux = require('../../aux');

function _wait(ms) {
  return new Bluebird((resolve) => {
    setTimeout(resolve, ms);
  });
}

function _genArrayOfClones(length, obj) {

  var arr = [];

  var i = 0;

  while (i < length) {
    arr.push(clone(obj));

    i++;
  }

  return arr;
}

describe('DomainRecord model', function () {

  var ASSETS;
  var DomainRecord;

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
          websiteHostIpAddresses: ['1.1.1.1', '0.0.0.0'],
          domainVerificationSampleSize: 10,
          domainActivationThreshold: 0.6,
          domainVerificationExpiresIn: '5s',
        });

        ASSETS.websiteApp = createWebsiteManager(options);

        return ASSETS.websiteApp.ready;

      })
      .then(() => {
        DomainRecord = ASSETS.websiteApp.services.mongoose.models.DomainRecord;
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });

  });

  afterEach(function () {
    return aux.teardown();
  });

  describe('domain uniqueness', function () {

    it('should ensure there is only one domainRecord at the active state with a given domain', function () {

      var record1 = new DomainRecord({
        projectId: 'some-project-id',
        websiteId: 'some-website-id',

        ipAddresses: ['1.1.1.1'],

        domain: 'test.habemus.xyz',
        targetDomain: 'test.habemus.xyz',

        verification: {
          expiresAt: Date.now(),
        }
      });

      // set the record status to active
      record1.setStatus('active', 'TestReason');

      var record2 = new DomainRecord({
        projectId: 'some-other-project-id',
        websiteId: 'some-other-website-id',

        ipAddresses: ['1.1.1.1'],

        domain: 'test.habemus.xyz',
        targetDomain: 'test.habemus.xyz',

        verification: {
          expiresAt: Date.now(),
        }
      });

      // set the record status to active
      record2.setStatus('active', 'TestReason');

      // save both records at the same time
      // to ensure that the uniqueness is ensured by database
      // index
      return Bluebird.all([
        record1.save(),
        record2.save()
      ])
      .then(aux.errorExpected, (err) => {

        // it should be a mongodb unique index violation error
        err.code.should.eql(11000);
      });
    });

    it('should allow multiple records to have the same domain if none of them are at the status ACTIVE', function () {
      var record1 = new DomainRecord({
        projectId: 'some-project-id',
        websiteId: 'some-website-id',

        ipAddresses: ['1.1.1.1'],

        domain: 'test.habemus.xyz',
        targetDomain: 'test.habemus.xyz',

        verification: {
          expiresAt: Date.now(),
        }
      });
      // set the record status to pending-verification
      record1.setStatus('pending-verification', 'TestReason');

      var record2 = new DomainRecord({
        projectId: 'some-other-project-id',
        websiteId: 'some-other-website-id',

        ipAddresses: ['1.1.1.1'],

        domain: 'test.habemus.xyz',
        targetDomain: 'test.habemus.xyz',

        verification: {
          expiresAt: Date.now(),
        }
      });
      // set the record status to failed
      record2.setStatus('verification-failed', 'TestReason');

      var record3 = new DomainRecord({
        projectId: 'some-yet-other-project-id',
        websiteId: 'some-yet-other-website-id',

        ipAddresses: ['1.1.1.1'],

        domain: 'test.habemus.xyz',
        targetDomain: 'test.habemus.xyz',

        verification: {
          expiresAt: Date.now(),
        }
      });
      // set the record status to failed
      record3.setStatus('pending-verification', 'TestReason');

      return Bluebird.all([
        record1.save(),
        record2.save(),
        record3.save()
      ])
      .then((records) => {
        records.length.should.eql(3);
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
    });

  });

  describe('statics#computeVerificationScores(verificationResults)', function () {

    it('should take an array of verification results and compute the verification scores', function () {

      var scores = DomainRecord.computeVerificationScores([
        {
          cnameDiff: {
            missing: [],
            matches: ['test.domain.com'],
            extraneous: [],
          },
          txtDiff: {
            missing: [],
            matches: ['verificationcode'],
            extraneous: [],
          },
          ipv4Diff: {
            missing: [],
            matches: ['1.1.1.1', '2.2.2.2'],
            extraneous: [],
          },
        },
        {
          cnameDiff: {
            missing: [],
            matches: ['test.domain.com'],
            extraneous: [],
          },
          txtDiff: {
            missing: [],
            matches: ['verificationcode'],
            extraneous: [],
          },
          ipv4Diff: {
            missing: [],
            matches: ['1.1.1.1', '2.2.2.2'],
            extraneous: [],
          },
        },
        {
          cnameDiff: {
            missing: [],
            matches: ['test.domain.com'],
            extraneous: [],
          },
          txtDiff: {
            missing: [],
            matches: ['verificationcode'],
            extraneous: [],
          },
          ipv4Diff: {
            missing: ['1.1.1.1'],
            matches: ['2.2.2.2'],
            extraneous: [],
          },
        },
      ]);

      scores.cnameScore.should.equal(3 / 3);
      scores.txtScore.should.equal(3 / 3);
      scores.ipv4Score.should.equal(2 / 3);
    });

  });

  describe('methods#addVerificationResult(verificationResult)', function () {
    it('should add a verification result to the verification.results array', function () {
      var record = new DomainRecord({
        domain: 'test.habemus.xyz'
      });

      record.addVerificationResult({
        cnameDiff: {
          missing: [],
          matches: ['test.domain.com'],
          extraneous: [],
        },
        txtDiff: {
          missing: [],
          matches: ['verificationcode'],
          extraneous: [],
        },
        ipv4Diff: {
          missing: ['1.1.1.1'],
          matches: ['2.2.2.2'],
          extraneous: [],
        },
      });

      record.get('verification.results').length.should.equal(1);
    });

    it('should set the status of the record to `verifying` if there are not enough successful verification results', function () {
      var record = new DomainRecord({
        domain: 'test.habemus.xyz'
      });

      record.addVerificationResult({
        cnameDiff: {
          missing: [],
          matches: ['test.domain.com'],
          extraneous: [],
        },
        txtDiff: {
          missing: [],
          matches: ['verificationcode'],
          extraneous: [],
        },
        ipv4Diff: {
          missing: ['1.1.1.1'],
          matches: ['2.2.2.2'],
          extraneous: [],
        },
      });

      record.getStatus().should.equal('verifying');
    });

    it('should set the status of the record to `active` if there are enough verification samples and all the scores are above the activation threshold', function () {
      var record = new DomainRecord({
        domain: 'test.habemus.xyz'
      });

      var results = _genArrayOfClones(10, {
        cnameDiff: {
          missing: [],
          matches: ['test.domain.com'],
          extraneous: [],
        },
        txtDiff: {
          missing: [],
          matches: ['verificationcode'],
          extraneous: [],
        },
        ipv4Diff: {
          missing: [],
          matches: ['2.2.2.2'],
          extraneous: [],
        },
      });

      results.forEach((r) => {
        record.addVerificationResult(r);
      });

      record.getStatus().should.equal('active');
    });

    it('should set the status of the record to `verifying` if not enough verification samples are given', function () {
      var record = new DomainRecord({
        domain: 'test.habemus.xyz'
      });

      var results = _genArrayOfClones(9, {
        cnameDiff: {
          missing: [],
          matches: ['test.domain.com'],
          extraneous: [],
        },
        txtDiff: {
          missing: [],
          matches: ['verificationcode'],
          extraneous: [],
        },
        ipv4Diff: {
          missing: [],
          matches: ['2.2.2.2'],
          extraneous: [],
        },
      });

      results.forEach((r) => {
        record.addVerificationResult(r);
      });

      record.getStatus().should.equal('verifying');
    });

    it('should set the status of the record to `verification-failed` if domainVerificationSampleSize is reached and the domainActivationThreshold is not achieved', function () {
      var record = new DomainRecord({
        domain: 'test.habemus.xyz'
      });

      var results = _genArrayOfClones(10, {
        cnameDiff: {
          missing: [],
          matches: ['test.domain.com'],
          extraneous: [],
        },
        txtDiff: {
          // FAIL HERE
          missing: ['verificationcode'],
          matches: [],
          extraneous: [],
        },
        ipv4Diff: {
          missing: [],
          matches: ['2.2.2.2'],
          extraneous: [],
        },
      });

      results.forEach((r) => {
        record.addVerificationResult(r);
      });

      // status should be at 'verification-failed'
      record.getStatus().should.equal('verification-failed');
    });

    it('should set the status of the record to `verification-failed-permanently` if the verification fails and the verification period has expired', function () {

      this.timeout(6000);

      var record = new DomainRecord({
        domain: 'test.habemus.xyz',
      });

      // let verification be started
      record.startVerification('TestReason');

      var mistakenResults = _genArrayOfClones(10, {
        cnameDiff: {
          missing: [],
          matches: ['test.domain.com'],
          extraneous: [],
        },
        txtDiff: {
          // FAIL HERE
          missing: ['verificationcode'],
          matches: [],
          extraneous: [],
        },
        ipv4Diff: {
          missing: [],
          matches: ['2.2.2.2'],
          extraneous: [],
        },
      });

      // wait 5 seconds (time that we've configured the `domainVerificationExpiresIn`)
      return _wait(5000).then(() => {

        // apply the mistaken results
        mistakenResults.forEach((r) => {
          record.addVerificationResult(r);
        });

        record.getStatus().should.equal('verification-failed-permanently');
      });

    });

  });
});
