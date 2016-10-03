function _objValues(obj) {
  var values = [];

  for (var prop in obj) {
    values.push(obj[prop]);
  }

  return values;
}

/**
 * List of website statuses.
 * 
 * @type {Object}
 */
exports.WEBSITE_STATUSES = {
  PENDING: 'pending',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
};
exports.VALID_WEBSITE_STATUSES = _objValues(exports.WEBSITE_STATUSES);

/**
 * List of billing statuses.
 * 
 * @type {Object}
 */
exports.BILLING_STATUSES = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  FAILED_PAYMENT: 'failed-payment',
};
exports.VALID_BILLING_STATUSES = _objValues(exports.BILLING_STATUSES);

/**
 * List of build statuses
 * 
 * @type {Object}
 */
exports.BUILD_STATUSES = {
  NOT_SCHEDULED: 'not-scheduled',
  SCHEDULED: 'scheduled',
  BUILDING: 'building',
  ERROR: 'error',
  SUCCESS: 'success',
};
exports.VALID_BUILD_STATUSES = _objValues(exports.BUILD_STATUSES);

/**
 * List of permissions scopes an website supports
 * @type {Object}
 */
exports.PERMISSIONS = {
  MANAGE: 'manage',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
};
exports.VALID_PERMISSIONS = _objValues(exports.PERMISSIONS);

/**
 * List of DomainRecord statuses
 * 
 * @type {Object}
 */
exports.RECORD_STATUSES = {
  PENDING: 'pending-verification',
  ACTIVE: 'active',
  VERIFYING: 'verifying',
  FAILED: 'verification-failed',
  FAILED_PERMANENTLY: 'verification-failed-permanently',
  SCHEDULED_FOR_REMOVAL: 'scheduled-for-removal',
};
exports.VALID_RECORD_STATUSES = _objValues(exports.RECORD_STATUSES);

/**
 * List of Events that will be published to redis
 * 
 * @type {Object}
 */
exports.EVENTS = {
  WEBSITE_DOMAIN_READY: 'website-domain-ready',
  WEBSITE_UPDATED: 'website-updated',
  WEBSITE_ENABLED: 'website-enabled',
  WEBSITE_DISABLED: 'website-disabled',
  WEBSITE_HEARTBEAT: 'website-heartbeat',
};
