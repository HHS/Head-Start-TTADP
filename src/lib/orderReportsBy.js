import {
  sequelize,
} from '../models';

const orderReportsBy = (sortBy, sortDir) => {
  let result = '';
  switch (sortBy) {
    case 'author':
      result = [[
        sequelize.literal(`authorName ${sortDir}`),
      ]];
      break;
    case 'collaborators':
      result = [[
        sequelize.literal(`collaboratorName ${sortDir} NULLS LAST`),
      ]];
      break;
    case 'topics':
      result = [[
        sequelize.literal(`topics ${sortDir}`),
      ]];
      break;
    case 'regionId':
      result = [[
        'regionId',
        sortDir,
      ],
      [
        'id',
        sortDir,
      ]];
      break;
    case 'activityRecipients':
      result = [
        [
          sequelize.literal(`granteeName ${sortDir}`),
        ],
        [
          sequelize.literal(`nonGranteeName ${sortDir}`),
        ]];
      break;
    case 'status':
    case 'startDate':
    case 'updatedAt':
      result = [[sortBy, sortDir]];
      break;
    default:
      break;
  }
  return result;
};

export default orderReportsBy;
