import { skipIf } from '../helpers/flowControl';
import {
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
  autoPopulateFlag,
} from '../helpers/isFlagged';

const beforeValidate = async (sequelize, instance, options) => {
  if (skipIf(options, 'beforeValidate')) return;
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateFlag(sequelize, instance, options, 'isFoiaable');
  autoPopulateFlag(sequelize, instance, options, 'isReferenced');
};

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

export {
  beforeValidate,
  beforeUpdate,
  beforeDestroy,
};
