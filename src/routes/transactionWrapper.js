import { sequelize } from '../models';

export default function transactionWrapper(originalFunction) {
  return async function wrapper(req, res, next) {
    return sequelize.transaction(async () => {
      const result = await originalFunction(req, res, next);
      return result;
    });
  };
}
