exports.evalOpt = function evalOpt(opt, req) {
  return (typeof opt === 'function') ? opt(req) : opt;
};
