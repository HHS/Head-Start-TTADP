import { sequelize } from '../models';
import handleErrors from '../lib/apiErrorHandler';

const namespace = 'SERVICE:WRAPPER';

const logContext = {
  namespace,
};

export default function transactionWrapper(originalFunction) {
  return async function wrapper(req, res, next) {
    let error;
    try {
      return sequelize.transaction(async () => {
        let result;
        try {
          result = await originalFunction(req, res, next);
        } catch (err) {
          error = err;
          throw err;
        }
        return result;
      });
    } catch (err) {
      return handleErrors(req, res, error || err, logContext);
    }
  };
}
