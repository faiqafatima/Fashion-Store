const { isCelebrateError } = require('celebrate');

const handleMalformedJson = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).send({ 
      status: "error", 
      message: "Malformed JSON",
      details: err.message,
    });
  }
  next();
};

const formatCelebrateErrors = (err, req, res, next) => {
  if (isCelebrateError(err)) {
    const errorBody = err.details.get('body');
    
    if (errorBody) {
      const errorDetails = errorBody.details[0];

      return res.status(400).json({
        status: "error",
        message: errorDetails.message,
        params: errorDetails.path,
      });
    }
  }
  next(err);
};

module.exports = {
  handleMalformedJson,
  formatCelebrateErrors,
};
