const aux = require('./auxiliary');

// exports a function that takes the app and some options and
// returns the middleware
module.exports = function (app, options) {
  /**
   * Private token used to authenticate h-website to h-project
   * @type {JWT}
   */
  const H_PROJECT_TOKEN = options.hProjectToken;

  const errors = app.errors;

  const hProject = app.services.hProject;

  /**
   * Default sub loader retrieves value from req
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _sub = options.sub || function (req) {
    return req.tokenData.sub;
  }

  /**
   * Function to get the project's id.
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _projectId = options.projectId || function (req) {
    return req.params.projectId;
  };

  /**
   * Permissions to be verified
   * @type {Array}
   */
  const _permissions = options.permissions;

  return function verifyPermissions(req, res, next) {
    /**
     * Requires authenticate middleware to have been executed
     * before in the middleware chain
     */
    var sub         = aux.evaluateOpt(_sub, req);
    var projectId   = aux.evaluateOpt(_projectId, req);
    var permissions = aux.evaluateOpt(_permissions, req);

    hProject.verifyProjectPermissions(
      H_PROJECT_TOKEN,
      sub,
      projectId,
      permissions
    )
    .then(() => {
      // allow
      next();
    })
    .catch((err) => {
      // prohibit
      next(err);
    });
  };
};