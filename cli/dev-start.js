// native
const http = require('http');

// internal dependencies
const pkg = require('../package.json');

// internal dependencies
const hWebsite = require('../server');

var options = {
  port: process.env.PORT,
  apiVersion: pkg.version,

  mongodbURI: process.env.MONGODB_URI,
  rabbitMQURI: process.env.RABBIT_MQ_URI,

  hAccountURI: process.env.H_ACCOUNT_URI,
  hAccountToken: process.env.H_ACCOUNT_TOKEN,

  hProjectURI: process.env.H_PROJECT_URI,
  hProjectToken: process.env.H_PROJECT_TOKEN,

  enablePrivateAPI: process.env.ENABLE_PRIVATE_API ? true : false,
  privateAPISecret: process.env.PRIVATE_API_SECRET,

  websiteServerIpAddresses: process.env.WEBSITE_SERVER_IP_ADDRESSES.split(','),

  corsWhitelist: process.env.CORS_WHITELIST,
};

// instantiate the app
var app = hWebsite(options);

// create http server and pass express app as callback
var server = http.createServer(app);

// start listening
server.listen(options.port, function () {
  console.log('hWebsite listening at port %s', options.port);
});
