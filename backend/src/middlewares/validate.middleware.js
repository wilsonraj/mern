/**
 * Generic validation middleware.
 * Pass in a validator function that returns { isValid, errors }.
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

export default validate;
