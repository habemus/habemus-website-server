// auxiliary
const aux = require('./auxiliary');

// exports a function that takes the app and some options and
// returns the middleware
module.exports = function (app, options) {

  const errors = app.errors;

  options = options || {};

  /**
   * Function that retrieves the domainRecord's identifier
   * Defaults to getting the identifier from the requests's 
   * `params.identifier` property
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  var _identifier = options.identifier || function (req) {
    return req.params.identifier;
  };

  /**
   * Function or value that represents which identifier property
   * the identifier parameter refers to.
   * There are three options: 
   *   - _id
   *   - activeDomain
   *   - code
   * 
   * @param  {express req} req
   * @return {String}
   */
  var _identifierProp = options.identifierProp || function (req) {

    var query = req.query;

    if (query.byActiveDomain !== undefined) {
      return 'activeDomain';
    } else if (query.byCode !== undefined) {
      return 'code';
    } else {
      // by default use _id as identifier prop
      return '_id';
    }
  }

  /**
   * Name of the property to be set onto the req object
   * to store the resulting domainRecord.
   * @type {String}
   */
  var _as = options.as || 'domainRecord';

  return function loadWebsite(req, res, next) {

    var identifier     = aux.evalOpt(_identifier, req);
    var identifierProp = aux.evalOpt(_identifierProp, req);
    var as             = aux.evalOpt(_as, req);

    switch (identifierProp) {
      case '_id':

        app.controllers.domainRecord.getById(identifier)
          .then((domainRecord) => {
            req[as] = domainRecord;

            next();
          })
          .catch(next);

        break;
      case 'activeDomain':

        app.controllers.domainRecord.getByActiveDomain(identifier)
          .then((domainRecord) => {
            req[as] = domainRecord;

            next();
          })
          .catch(next);

        break;
      case 'code':

        app.controllers.domainRecord.getByCode(identifier)
          .then((domainRecord) => {
            req[as] = domainRecord;

            next();
          })
          .catch(next);

        break;
      default:
        next(new Error('unsupported identifierProp ' + identifierProp));
        break;
    }
  };
};
