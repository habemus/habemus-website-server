// third-party
const uuid       = require('uuid');
const mongoose   = require('mongoose');
const makeStatus = require('mongoose-make-status');
const makeAcls   = require('mongoose-make-acls');
const clone      = require('clone');
const ms         = require('ms');
const moment     = require('moment');

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
    subdomain: {
      type: String,
      default: 'habemus-verify',
    },
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

    /**
     * Date time at which the verification MUST expire
     * and the record (if not yet active) be marked
     * as failed-permanently
     * 
     * @type {Object}
     */
    expiresAt: {
      type: Date,
      default: Date.now,
    },

    /**
     * Array of verification results
     * @type {Array}
     */
    results: [mongoose.Schema.Types.Mixed],

    /**
     * Stores the computed partial results
     * for the verification
     *
     * each partial result has the following format: {
     *   score: Number,
     *   active: Boolean
     * }
     * 
     * @type {Object}
     */
    computedPartialResults: {
      type: Object,
      default: {}
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

  // createdAt: mongoose-timestamps
  // updatedAt: mongoose-timestamps

}, {

  /**
   * Enable mongoose timestamps in order to have
   * `createdAt` and `updatedAt`
   * @type {Boolean}
   */
  timestamps: true
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
 * the domainRecord Schema
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
   * Quantity of milliseconds to wait for the 
   * verification process to succeed before human intervention.
   * 
   * @type {Number}
   */
  var VERIFICATION_EXPIRY = options.domainVerificationExpiresIn || '48h';
  VERIFICATION_EXPIRY = typeof VERIFICATION_EXPIRY === 'number' ?
    VERIFICATION_EXPIRY : ms(VERIFICATION_EXPIRY);

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
   * Sets the record to be ready for starting a verification process
   * @param  {String} reason
   */
  domainRecordSchema.methods.startVerification = function (reason) {
    // set verification expiry
    this.set(
      'verification.expiresAt',
      moment().add(VERIFICATION_EXPIRY, 'ms').toDate()
    );

    // set status to 'pending-verification'
    this.setStatus(
      CONSTANTS.RECORD_STATUSES.PENDING,
      reason
    );

    // reset the verification results
    this.resetVerificationResults();
  };
  
  /**
   * Resets the verification results to an empty array
   */
  domainRecordSchema.methods.resetVerificationResults = function () {
    this.set('verification.results', []);
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
    var results = this.get('verification.results');
    if (results) {
      // make a copy of the results array
      results = results.map((result) => {
        return result;
      })
    } else {
      // no results, set it to an array
      results = [];
    }

    if (results.length === VERIFICATION_SAMPLE_SIZE) {
      // remove the last item
      results.pop();
    }

    // add the last result to the head of the array
    results.unshift(result);

    this.set('verification.results', results);

    /**
     * Check if the record's verification status is above the 
     * required activation threshold
     */
    var scores = domainRecordSchema.statics.computeVerificationScores(results);

    var _cnameActive = (!this.get('enableWwwAlias') || scores.cnameScore >= DOMAIN_ACTIVATION_THRESHOLD);
    var _txtActive   = scores.txtScore >= DOMAIN_ACTIVATION_THRESHOLD;
    var _ipv4Active  = scores.ipv4Score >= DOMAIN_ACTIVATION_THRESHOLD;

    var _active = (_cnameActive && _txtActive && _ipv4Active);

    // set partial statuses
    this.set('verification.computedPartialResults', {
      cname: {
        score: scores.cnameScore,
        active: _cnameActive,
      },
      txt: {
        score: scores.txtScore,
        active: _txtActive,
      },
      ipv4: {
        score: scores.ipv4Score,
        active: _ipv4Active
      }
    });
    
    if (results.length >= VERIFICATION_SAMPLE_SIZE) {

      if (_active) {
        // SUCCESS
        this.setStatus(
          CONSTANTS.RECORD_STATUSES.ACTIVE,
          'VerificationSuccess'
        );

      } else {
        // FAILED

        // check if the verification has expired
        var expired = moment().isAfter(this.get('verification.expiresAt'));
        if (expired) {
          // failed permanently.
          // demand user's action
          this.setStatus(
            CONSTANTS.RECORD_STATUSES.FAILED_PERMANENTLY,
            'VerificationPeriodExpired'
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
    var verificationResults = this.get('verification.results');

    return domainRecordSchema.statics.computeVerificationScores(verificationResults);
  });

  var DomainRecord = conn.model('DomainRecord', domainRecordSchema);
  
  return DomainRecord;
};
