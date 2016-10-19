// native
const http = require('http');

// third-party
const envOptions = require('@habemus/env-options');

// internal dependencies
const hWebsite = require('../server');

var options = envOptions({
  port: 'env:PORT',
  apiVersion: 'pkg:version',

  corsWhitelist: 'list:CORS_WHITELIST',
  hostDomain: 'env:HOST_DOMAIN',
  websiteServerIpAddresses: 'list:WEBSITE_SERVER_IP_ADDRESSES',
  cronDomainVerifier: 'env?:CRON_DOMAIN_VERIFIER',
  cronDomainVerificationScheduler: 'env?:CRON_DOMAIN_VERIFICATION_SCHEDULER',
  domainVerificationSampleSize: 'num?:DOMAIN_VERIFICATION_SAMPLE_SIZE',
  domainActivationThreshold: 'num?:DOMAIN_ACTIVATION_THRESHOLD',
  domainVerificationExpiresIn: 'env?:DOMAIN_VERIFICATION_EXPIRES_IN',

  mongodbURI: 'fs:MONGODB_URI_PATH',
  rabbitMQURI: 'fs:RABBIT_MQ_URI_PATH',

  hAccountURI: 'env:H_ACCOUNT_URI',
  hAccountToken: 'fs:H_ACCOUNT_TOKEN_PATH',

  hProjectURI: 'env:H_PROJECT_URI',
  hProjectToken: 'fs:H_PROJECT_TOKEN_PATH',

  enablePrivateAPI: 'bool?:ENABLE_PRIVATE_API',
  privateAPISecret: 'fs?:PRIVATE_API_SECRET_PATH',
});

// instantiate the app
var app = hWebsite(options);

app.ready.then(() => {
  console.log('h-website setup ready');
})
.catch((err) => {
  console.error('h-website setup error', err);
  process.exit(1);
});

// create http server and pass express app as callback
var server = http.createServer(app);

// start listening
server.listen(options.port, function () {
  console.log('hWebsite listening at port %s', options.port);
});
