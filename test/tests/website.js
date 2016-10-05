const fs   = require('fs');
const path = require('path');

const should = require('should');
const Bluebird = require('bluebird');
const mongoose = require('mongoose');
const mockery  = require('mockery');
const mockPrivateHProject = require('h-project-client/mock/private');

const ValidationError = mongoose.Error.ValidationError;

// auxiliary
const aux = require('../aux');


const PROJECT_MOCK_DATA = {};

PROJECT_MOCK_DATA.projects = [
  {
    _id: 'project-1-id',
    code: 'project-1-code',
    billingStatus: {
      value: 'enabled',
    },
  },
  {
    _id: 'project-2-id',
    code: 'project-2-code',
    billingStatus: {
      value: 'disabled',
    },
  }
];

PROJECT_MOCK_DATA.projectVersions = [
  {
    code: 'v1',
    projectId: 'project-1-id',
    distSignedURL: 'http://project-host.com/project-1-id.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v2',
    projectId: 'project-1-id',
    distSignedURL: 'http://project-host.com/project-1-id.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v1',
    projectId: 'project-2-id',
    distSignedURL: 'http://project-host.com/project-2-id.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v2',
    projectId: 'project-2-id',
    distSignedURL: 'http://project-host.com/project-2-id.zip',
    buildStatus: {
      value: 'succeeded',
    }
  },
  {
    code: 'v3',
    projectId: 'project-2-id',
    distSignedURL: 'http://project-host.com/project-2-id.zip',
    buildStatus: {
      value: 'succeeded',
    }
  }
];

describe('websiteCtrl.resolve(domain)', function () {

  var ASSETS;
  var domainRecordCtrl;
  var websiteCtrl;

  beforeEach(function () {

    this.timeout(10000);
    
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    // mock h-project/client/private
    mockery.registerMock(
      'h-project-client/private',
      mockPrivateHProject({
        data: PROJECT_MOCK_DATA,
      })
    );

    // re-require the website manager app
    // after enabling mockery
    const hWebsite = require('../../server');
    
    return aux.setup()
      .then((assets) => {

        ASSETS = assets;

        var options = aux.genOptions({
          websiteServerIpAddresses: ['1.1.1.1', '0.0.0.0'],
          domainVerificationSampleSize: 5,
          domainActivationThreshold: 0.6,
          maxDomainFailureCount: 5
        });

        ASSETS.hWebsite = hWebsite(options);

        return ASSETS.hWebsite.ready;

      })
      .then((hWebsite) => {

        websiteCtrl      = hWebsite.controllers.website;
        domainRecordCtrl = hWebsite.controllers.domainRecord;

        // create some records
        return Bluebird.all([
          // project-1, active
          domainRecordCtrl.create('project-1-id', 'www.my-domain.com', {
            verification: {
              code: 'someverificationcode'
            }
          }),
          // project-1, not active
          domainRecordCtrl.create('project-1-id', 'another.my-domain.com', {
            verification: {
              code: 'someverificationcode'
            }
          }),

          // project-2, active
          domainRecordCtrl.create('project-2-id', 'yet.another.my-domain.com', {
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
      return websiteCtrl.resolveCustomDomain('www.my-domain.com')
        .then((website) => {
          website._id.should.be.instanceof(String);
          website.signedURL.should.be.instanceof(String);
          website.activeDomainRecords.length.should.eql(1);
          website.activeDomainRecords[0].domain.should.be.instanceof(String);
          website.activeDomainRecords[0].enableWwwAlias.should.eql(true);
        });
    });

    it('should return NotFound error in case the domain does not match any record', function () {
      return websiteCtrl.resolveCustomDomain('www.not-my-domain.com')
        .then(aux.errorExpected, (err) => {
          err.name.should.eql('NotFound');
        });
    });
  });

  describe('#resolveHabemus(domainData)', function () {
    it('should resolve a versioned habemus domain string', function () {
      return websiteCtrl.resolveHabemus('v1.project-2-code.habemus.xyz')
        .then((website) => {
          website._id.should.be.instanceof(String);
          website.signedURL.should.be.instanceof(String);

          // active records are empty, as this is a versioned url
          website.activeDomainRecords.should.be.instanceof(Array);
          website.activeDomainRecords.length.should.eql(0);
        });
    });

    it('should resolve an unversioned habemus domain string', function () {
      return websiteCtrl.resolveHabemus('project-2-code.habemus.xyz')
        .then((website) => {
          website._id.should.be.instanceof(String);
          website.signedURL.should.be.instanceof(String);

          // active records should contain a domain
          website.activeDomainRecords.should.be.instanceof(Array);
          website.activeDomainRecords.length.should.eql(1);
        });
    });

    it('should resolve an habemus domain data object', function () {
      return websiteCtrl.resolveHabemus({
          version: 'v2',
          code: 'project-2-code',
        })
        .then((website) => {
          website._id.should.be.instanceof(String);
          website.signedURL.should.be.instanceof(String);
          website.activeDomainRecords.should.be.instanceof(Array);
          website.activeDomainRecords.length.should.eql(0);
        });
    });
  });

  describe('#resolve(domain)', function () {
    it('should check the domain type and resolve accordingly', function () {
      return websiteCtrl.resolve('v1.project-2-code.habemus.xyz')
        .then((website) => {
          website._id.should.be.instanceof(String);
        });
    });
    it('should check the domain type and resolve accordingly', function () {
      return websiteCtrl.resolve('project-2-code.habemus.xyz');
    });
  });
});
