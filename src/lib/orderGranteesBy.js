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
          'id',
          sortDir,
        ],
      ];
      break;
    case 'programSpecialist':
      result = [
        [
          'grants', 'programSpecialistName', sortDir,
        ],
      ];
      break;
    default:
      break;
  }
  return result;
};

export default orderGranteesBy;
