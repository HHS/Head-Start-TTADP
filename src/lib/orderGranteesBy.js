import { sequelize } from '../models';

const orderGranteesBy = (sortBy, sortDir) => {
  let result = '';
  switch (sortBy) {
    case 'name':
      result = [[
        'name',
        sortDir,
      ]];
      break;
    case 'regionId':
      result = [
        [
          'grants', 'regionId', sortDir,
        ],
        [
          'name',
          sortDir,
        ],
      ];
      break;
    case 'programSpecialist':
      result = [
        [
          sequelize.literal('"programSpecialists"'), sortDir,
        ],
      ];
      break;
    case 'grantSpecialist':
      result = [
        [
          sequelize.literal('"grantSpecialists"'), sortDir,
        ],
      ];
      break;
    default:
      break;
  }
  return result;
};

export default orderGranteesBy;
