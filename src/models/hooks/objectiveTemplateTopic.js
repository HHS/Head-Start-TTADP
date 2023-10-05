import { checkForAttemptToChangeFoiaableValue } from '../helpers/isFlagged';

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

export {
  beforeUpdate,
};
