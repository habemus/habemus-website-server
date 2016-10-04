// constants
const TRAILING_SLASH_RE = /\/$/;

function PrivateHWebsiteClient(options) {
  if (!options.serverURI) { throw new TypeError('serverURI is required'); }

  this.serverURI = options.serverURI.replace(TRAILING_SLASH_RE, '');
  // private api is located at the base route '/_'
  this.serverURI = this.serverURI + '/_';
}

Object.assign(PrivateHWebsiteClient.prototype, require('./aux'));
Object.assign(PrivateHWebsiteClient.prototype, require('./methods/private'));
Object.assign(PrivateHWebsiteClient.prototype, require('./methods/shared'));

module.exports = PrivateHWebsiteClient;
