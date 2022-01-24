const orderGoalsBy = (sortBy, sortDir) => {
  let result = '';
  switch (sortBy) {
    case 'goalStatus':
      result = [['status', sortDir]];
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
