const fs   = require('fs');
const path = require('path');

const should = require('should');
const Bluebird = require('bluebird');
const mongoose = require('mongoose');
const mockery  = require('mockery');

const ValidationError = mongoose.Error.ValidationError;

// auxiliary
const aux = require('../../aux');

describe('domainRecordCtrl.create(domain, recordData)', function () {

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
          websiteHostIpAddresses: ['1.1.1.1', '0.0.0.0'],
          domainVerificationSampleSize: 5,
          domainActivationThreshold: 0.6,
          maxDomainFailureCount: 5
        });

        ASSETS.websiteApp = createWebsiteManager(options);

        return ASSETS.websiteApp.ready;

      })
      .then((websiteApp) => {
        domainRecordCtrl = websiteApp.controllers.domainRecord;
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

  it('should create a DomainRecord entry', function () {
    return domainRecordCtrl.create('www.test.habemus.xyz', {
      projectId: 'project-1',
    })
    .then((record) => {

      // should remove the 'www' from the domain
      record.domain.should.equal('test.habemus.xyz');
    })
    .catch((err) => {
      console.warn(err);
    });
  });

  it('should require a domain as the first argument', function () {
    return domainRecordCtrl.create(undefined, {
      projectId: 'project-1',
    })
    .then(aux.errorExpected, (err) => {
      err.name.should.equal('InvalidOption');
    });
  });

  it('should require a projectId', function () {
    return domainRecordCtrl.create('www.test.habemus.xyz', {})
      .then(aux.errorExpected, (err) => {
        err.name.should.eql('ValidationError');
      });
  });
});
