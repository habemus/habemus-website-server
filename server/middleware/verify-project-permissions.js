// const aux = require('./auxiliary');

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
   * The default projectCode getter retrieves its value
   * from `req.workspace.projectCode`.
   * Expects the workspace to have been loaded by a previous middleware
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _projectCode = options.projectCode || function (req) {
    return req.workspace.projectCode;
  };

  /**
   * Function to get the project's id.
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _projectId = options.projectId || function (req) {
    return req.workspace ? req.workspace.projectId : false;
  };

  /**
   * Permissions to be verified
   * @type {Array}
   */
  const _permissions = options.permissions;

  return function verifyPermissions(req, res, next) {
    /**
     * Requires parse-auth-token middleware to have been executed
     * before in the middleware chain
     */
    var sub         = aux.evaluateOpt(_sub, req);
    var projectCode = aux.evaluateOpt(_projectCode, req);
    var projectId   = aux.evaluateOpt(_projectId, req);
    var permissions = aux.evaluateOpt(_permissions, req);

    var promise;

    if (projectCode) {

      promise = hProject.verifyProjectPermissions(
        H_PROJECT_TOKEN,
        sub,
        projectCode,
        permissions,
        {
          byId: false,
        }
      );

    } else {

      promise = hProject.verifyProjectPermissions(
        H_PROJECT_TOKEN,
        sub,
        projectId,
        permissions,
        {
          byId: true,
        }
      );
    }
    
    promise.then(() => {
      // allow
      next();
    })
    .catch((err) => {
      // prohibit
      next(err);
    });
  };
};