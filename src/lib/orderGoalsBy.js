import {
  sequelize,
} from '../models';

const orderGoalsBy = (sortBy, sortDir) => {
  let result = '';
  switch (sortBy) {
    case 'goalStatus':
      result = [
        [sequelize.literal(`status_sort ${sortDir}`)],
        ['createdAt', 'DESC'],
      ];
      break;
    case 'createdOn':
      result = [
        ['createdAt', sortDir],
        [sequelize.literal('status_sort ASC')],
      ];
      break;
    default:
      break;
  }
  return result;
};

export default orderGoalsBy;
