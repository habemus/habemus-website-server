// third-party
const uuid       = require('uuid');
const mongoose   = require('mongoose');
const makeStatus = require('mongoose-make-status');
const makeAcls   = require('mongoose-make-acls');
const clone      = require('clone');

// constants
const WWW_REG_EXP = /^www\./;
const MAX_DOMAIN_PART_LENGTH = 63;

const CONSTANTS = require('../../shared/constants');

function _isDomainValid(domain) {

  var split = domain.split('.');

  if (split.length <= 1) {
    return false;
  }

  if (WWW_REG_EXP.test(domain)) {
    return false;
  }

  return split.every((part) => {
    return part.length <= MAX_DOMAIN_PART_LENGTH;
  });
}

/**
 * The Schema object for a domainRecord
 * @type {mongoose}
 */
var domainRecordSchema = new mongoose.Schema({
  /**
   * Reference to the project this domain record is part of
   * @type {Object}
   */
  projectId: {
    type: String,
    required: true,
  },

  /**
   * The domain under which the website will be served
   * @type {Object}
   */
  domain: {
    type: String,
    required: true,

    validate: {
      validator: _isDomainValid,
      message: '{VALUE} is an invalid domain name',
      type: 'DomainInvalid',
    }
  },

  /**
   * Data related to domain verification
   * @type {Object}
   */
  verification: {
    code: {
      type: String,
      default: function () {
        return uuid.v4().replace(/-/g, '');
      }
    },
    method: {
      type: String,
      default: 'DNSSubdomain',
    },
    detail: {
      type: Object,
      default: {},
    },
  },

  enableWwwAlias: {
    type: Boolean,
    default: true,
  },

  ipAddresses: {
    type: [String],
    required: true,
  },
});

/**
 * Define a partial index to ensure there is only
 * one domain at status 'active'.
 * 
 * @type {Number}
 */
domainRecordSchema.index(
  {
    domain: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      'status.value': CONSTANTS.RECORD_STATUSES.ACTIVE
    }
  }
);
  
/**
 * Normalize data before running validation
 */
domainRecordSchema.pre('validate', function (next) {

  /**
   * Ensure the domain does not start with `www.`
   */
  this.domain = this.domain.replace(WWW_REG_EXP, '');

  next();
});

/**
 * Add status-related functionalities to
 * the website Schema
 */
makeStatus(domainRecordSchema, {
  statuses: CONSTANTS.VALID_RECORD_STATUSES,
});

// takes the connection and options and returns the model
module.exports = function (conn, app, options) {

  /**
   * Quantity of domain verification results
   * from which to compute the status.
   * 
   * @type {Number}
   */
  const VERIFICATION_SAMPLE_SIZE = options.domainVerificationSampleSize || 10;

  /**
   * The threshold value between 0 and 1
   * after which the domain will be activated.
   * 
   * @type {Number}
   */
  const DOMAIN_ACTIVATION_THRESHOLD = options.domainActivationThreshold || 0.6;

  /**
   * The threshold value between 0 and 1
   * lower to which the domain record should be marked
   * as 'verification-failed'
   * 
   * @type {Number}
   */
  const DOMAIN_FAILURE_THRESHOLD = options.domainFailureThreshold || 0.2;

  /**
   * Max number of failures before considering the domain record
   * to have failed-permanently
   * 
   * @type {[type]}
   */
  const MAX_DOMAIN_FAILURE_COUNT = options.maxDomainFailureCount || 5;

  // STATICS

  /**
   * Helper method that strips starting 'www.' if present
   * from the domain name.
   * 
   * @param  {String} domain
   * @return {String}
   */
  domainRecordSchema.statics.stripWww = function (domain) {
    return domain.replace(WWW_REG_EXP, '');
  };

  /**
   * Computes the verification status given
   * an array of verificationResults
   * 
   * @param  {Array} verificationResults
   * @return {Object}
   */
  domainRecordSchema.statics.computeVerificationScores = function (results) {

    var statusObj = results.reduce((status, result) => {

      if (result.cnameDiff.missing.length === 0) {
        status.cnameScore += 1;
      }

      if (result.txtDiff.missing.length === 0) {
        status.txtScore += 1;
      }

      if (result.ipv4Diff.missing.length === 0 &&
          result.ipv4Diff.extraneous.length === 0) {
        status.ipv4Score += 1;
      }

      return status;

    }, {
      cnameScore: 0,
      txtScore: 0,
      ipv4Score: 0,
    });

    statusObj.cnameScore = statusObj.cnameScore / results.length;
    statusObj.txtScore   = statusObj.txtScore / results.length;
    statusObj.ipv4Score  = statusObj.ipv4Score / results.length;

    return statusObj;
  };


  // METHODS
  
  /**
   * Resets the verification results to an empty array
   */
  domainRecordSchema.methods.resetVerificationResults = function () {
    this.set('verification.detail.results', []);
  };

  /**
   * Adds a verification result to the array of results
   * Enforces the verification result's format
   * 
   * @param {Object} result
   */
  domainRecordSchema.methods.addVerificationResult = function (result) {

    if (!result.txtDiff) {
      throw new TypeError('result.txtDiff is required');
    }

    if (!result.cnameDiff) {
      throw new TypeError('result.cnameDiff is required');
    }

    if (!result.ipv4Diff) {
      throw new TypeError('result.ipv4Diff is required');
    }

    // ensure the verification results is an array
    var results = this.verification.detail.results || [];
    results = clone(results);

    if (results.length === VERIFICATION_SAMPLE_SIZE) {
      // remove the last item
      results.pop();
    }

    // add the last result to the head of the array
    results.unshift(result);

    this.set('verification.detail.results', results);

    /**
     * Check if the record's verification status is above the 
     * required activation threshold
     */
    var scores = domainRecordSchema.statics.computeVerificationScores(results);

    var _cnameActive = (!this.get('enableWwwAlias') || scores.cnameScore >= DOMAIN_ACTIVATION_THRESHOLD);
    var _txtActive   = scores.txtScore >= DOMAIN_ACTIVATION_THRESHOLD;
    var _ipv4Active  = scores.ipv4Score >= DOMAIN_ACTIVATION_THRESHOLD;

    var _active = (_cnameActive && _txtActive && _ipv4Active);

    // // check if the verification has failed
    // var _cnameFailed = (this.get('enableWwwAlias') && scores.cnameScore <= DOMAIN_FAILURE_THRESHOLD);
    // var _txtFailed   = scores.txtScore <= DOMAIN_FAILURE_THRESHOLD;
    // var _ipv4Failed  = scores.ipv4Score <= DOMAIN_FAILURE_THRESHOLD;

    // var _failed = (_cnameFailed || _txtFailed || _ipv4Failed);
    
    if (results.length === VERIFICATION_SAMPLE_SIZE) {

      if (_active) {
        // SUCCESS
        this.setStatus(
          CONSTANTS.RECORD_STATUSES.ACTIVE,
          'VerificationSuccess'
        );

      } else {
        // FAILED

        // check if the verification has failed more than the max allowed
        // amount of times
        var failureCount = this.get('verification.detail.failureCount') || 0;

        // increment failureCount
        failureCount += 1;

        // save the failureCount
        this.set('verification.detail.failureCount', failureCount);

        if (failureCount >= MAX_DOMAIN_FAILURE_COUNT) {
          // failed permanently.
          // demand user's action
          this.setStatus(
            CONSTANTS.RECORD_STATUSES.FAILED_PERMANENTLY,
            'MaxFailureCountExceeded'
          );
        } else {
          // failed temporarily,
          // will be automatically reattempted
          this.setStatus(
            CONSTANTS.RECORD_STATUSES.FAILED,
            'VerificationFailed'
          );
        }
      }

    } else {
      // VERIFYING
      this.setStatus(
        CONSTANTS.RECORD_STATUSES.VERIFYING,
        'VerificationInProcess'
      );
    }
  };

  // VIRTUALS
  domainRecordSchema.virtual('verificationScores').get(function () {
    var verificationResults = this.get('verification.detail.results');

    return domainRecordSchema.statics.computeVerificationScores(verificationResults);
  });

  var DomainRecord = conn.model('DomainRecord', domainRecordSchema);
  
  return DomainRecord;
};
