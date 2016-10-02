// native
const util = require('util');

/**
 * Base error constructor
 * @param {String} message
 */
function HWebsiteError(message) {
  Error.call(this);
  
  this.message = message;
};
util.inherits(HWebsiteError, Error);
HWebsiteError.prototype.name = 'HWebsiteError';
exports.HWebsiteError = HWebsiteError;

/**
 * Happens when any required option is invalid
 *
 * error.option should have the option that is invalid
 * error.kind should contain details on the error type
 * 
 * @param {String} option
 * @param {String} kind
 * @param {String} message
 */
function InvalidOption(option, kind, message) {
  HWebsiteError.call(this, message);

  this.option = option;
  this.kind = kind;
}
util.inherits(InvalidOption, HWebsiteError);
InvalidOption.prototype.name = 'InvalidOption';
exports.InvalidOption = InvalidOption;

/**
 * Happens whenever an action requested is not authorized
 * by the server
 * @param {String} message
 */
function Unauthorized(message) {
  HWebsiteError.call(this, message);
}
util.inherits(Unauthorized, HWebsiteError);
Unauthorized.prototype.name = 'Unauthorized';

/**
 * Happens whenever the token provided for auth is invalid
 */
function InvalidToken() {
  HWebsiteError.call(this, 'Token provided is invalid');
}
util.inherits(InvalidToken, HWebsiteError);
InvalidToken.prototype.name = 'InvalidToken';

/**
 * Happens whenever the file is too large for the server
 * @param {Number} maxFilesize Max filesize in bytes.
 */
function MaxFilesizeExceeded(maxFilesize) {
  HWebsiteError.call(this, 'File is too large');

  this.limit = maxFilesize;
}
util.inherits(MaxFilesizeExceeded, HWebsiteError);
MaxFilesizeExceeded.prototype.name = 'MaxFilesizeExceeded';

/**
 * Happens whenever an entity is not found in the database
 */
function NotFound(resource, resourceId) {
  HWebsiteError.call(this, 'item not found');
  
  this.resource = resource;
  this.resourceId = resourceId;
}
util.inherits(NotFound, HWebsiteError);
NotFound.prototype.name = 'NotFound';

/**
 * Happens whenever a resource is already in use and 
 * thus not available
 * @param {String} resource
 * @param {String} value
 */
function InUse(resource, resourceId) {
  HWebsiteError.call(this, 'Resource in use');

  this.resource = resource;
  this.resourceId = resourceId;
}
util.inherits(InUse, HWebsiteError);
InUse.prototype.name = 'InUse';

/**
 * Happens when any upload of the website files fails
 */
function UploadFailed() {
  HWebsiteError.call(this, 'Upload failed');
}
util.inherits(UploadFailed, HWebsiteError);
UploadFailed.prototype.name = 'UploadFailed';

function Unauthorized() {
  HWebsiteError.call(this, 'Unauthorized');
}
util.inherits(Unauthorized, HWebsiteError);
Unauthorized.prototype.name = 'Unauthorized';

exports.Unauthorized = Unauthorized;
exports.InvalidToken = InvalidToken;
exports.MaxFilesizeExceeded = MaxFilesizeExceeded;
exports.NotFound = NotFound;
exports.InUse = InUse;
exports.UploadFailed = UploadFailed;
exports.Unauthorized = Unauthorized;
