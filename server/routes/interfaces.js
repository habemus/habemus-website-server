exports.WEBSITE_DATA = {
  _id: true,
  signedURL: true,
  activeRecords: true,
  'billingStatus.value': true,
};

exports.RECORD_DATA = {
  _id: true,
  projectId: true,
  domain: true,
  enableWwwAlias: true,
  'status.value': true,
  'status.updatedAt': true,
  'verification.subdomain': true,
  'verification.code': true,
  'verification.method': true,
  'verification.detail': true,
  'verification.computedPartialResults': true,
  ipAddresses: true,
};
