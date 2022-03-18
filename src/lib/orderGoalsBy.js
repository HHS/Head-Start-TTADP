import {
  sequelize,
} from '../models';

const orderGoalsBy = (sortBy, sortDir) => {
  let result = '';
  switch (sortBy) {
    case 'goalStatus':
      result = [[sequelize.literal(`status_sort ${sortDir}`)]];
      break;
    case 'createdOn':
      result = [['createdAt', sortDir]];
      break;
    default:
      break;
  }
  return result;
};

export default orderGoalsBy;
