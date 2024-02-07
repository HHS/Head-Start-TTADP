import {
  sequelize,
} from '../models';
/**
 *
 * @param {String} sortBy
 * @param {String} sortDir
 * @returns Array[] of shape [sequelize.col(), String sortDir]
 */

// note that this can only be used when a) Status Sort is a aliased SQL function and
// b) it's the first aliased variable due to the way Sequelize minifies arrays

// storing this in a constant so it looks a little less magical/stupid
export const STATUS_SORT = '_0';
export const MERGED_ID = '_1';

const orderGoalsBy = (sortBy, sortDir) => {
  let result = '';
  switch (sortBy) {
    case 'mergedGoals':
      result = [
        [sequelize.col(MERGED_ID), 'ASC'],
        [sequelize.col(STATUS_SORT), sortDir],
        [sequelize.col('createdAt'), 'DESC'],
      ];
      break;
    case 'goalStatus':
      result = [
        [sequelize.col(STATUS_SORT), sortDir],
        [sequelize.col('createdAt'), 'DESC'],
      ];
      break;
    case 'createdOn':
      result = [
        [sequelize.col('createdAt'), sortDir],
        [sequelize.col(STATUS_SORT), 'ASC'],
      ];
      break;
    case 'id':
    default:
      result = [
        [sequelize.col('id'), sortDir],
        [sequelize.col(STATUS_SORT), sortDir],
      ];
      break;
  }
  return result;
};

export default orderGoalsBy;
