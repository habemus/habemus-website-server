module.exports = function (app, options) {
  var verificationJob = require('./verifier')(app, options);
  var reschedulingJob = require('./verification-scheduler')(app, options);

  return {
    start: function () {
      verificationJob.start();
      reschedulingJob.start();
    },
    stop: function () {
      verificationJob.stop();
      reschedulingJob.stop();
    }
  }
};
