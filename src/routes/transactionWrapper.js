import { sequelize } from '../models';

export default function transactionWrapper(originalFunction) {
  return async function wrapper(req, res, next) {
    return sequelize.transaction(async () => {
      console.log('in')
      const result = await originalFunction(req, res, next);
      console.log('out')
      return result;
    });
  };
}
