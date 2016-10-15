module.exports = function (app, options) {
  var verificationJob = require('./verification')(app, options);
  var reschedulingJob = require('./verification-rescheduling')(app, options);

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
