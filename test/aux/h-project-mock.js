// third-party
const Bluebird = require('bluebird');

const PROJECTS = [
  {
    _id: 'project-1-id',
    code: 'project-1-code',
    billingStatus: {
      value: 'enabled',
    },
    distSignedURL: 'http://project-1-signed-url.com',
  },
  {
    _id: 'project-2-id',
    code: 'project-2-code',
    billingStatus: {
      value: 'disabled',
    },
    distSignedURL: 'http://project-2-signed-url.com',
  }
];

const PROJECT_VERSIONS = [
  {

  }
];

// mock h-project/client/private module and make it respond with the correct data
function HProjectMock(options) {}

HProjectMock.prototype.getById = function (authToken, projectId, options) {

  return new Bluebird((resolve, reject) => {
    var proj = PROJECTS.find((proj) => {
      return (proj._id === projectId);
    });

    if (proj) {
      resolve(proj);
    } else {
      reject(new Error('NotFound'));
    }

  });
};

HProjectMock.prototype.getByCode = function (authToken, projectCode, options) {
  return new Bluebird((resolve, reject) => {
    var proj = PROJECTS.find((proj) => {
      return (proj.code === projectCode);
    });

    if (proj) {
      resolve(proj);
    } else {
      reject(new Error('NotFound'));
    }

  });
};

HProjectMock.prototype.getProjectVersion = function (authToken, projectId, versionCode, options) {

  return Bluebird.resolve({
    code: 'v1',
    srcSignedURL: 'http://somewebsite.com/project.zip',
    distSignedURL: 'http://somewebsite.com/project-dist.zip',
    buildStatus: {
      value: 'succeeded',
    }
  });
};

module.exports = HProjectMock;
