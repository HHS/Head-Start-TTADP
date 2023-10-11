import { Op } from 'sequelize';

const beforeFieldDate = (
  field: string,
  date: string,
):object => ({
  [Op.and]: {
    [`data.${field}`]: {
      [Op.lte]: date[0],
    },
  },
});

const afterFieldDate = (
  field: string,
  date: string,
):object => ({
  [Op.and]: {
    [`data.${field}`]: {
      [Op.gte]: date[0],
    },
  },
});

const withinFieldDates = (
  field: string,
  dates: string,
):object => {
  const splitDates = dates[0].includes(' - ')
    ? dates[0].split(' - ')
    : dates[0].split('-');
    console.log(splitDates);
  if (splitDates.length !== 2) {
    return {};
  }
  const start = splitDates[0];
  const end = splitDates[1];
  return {
    [Op.and]: {
      [`data.${field}`]: {
        [Op.between]: [start, end],
      },
    },
  };
};

const filterFieldDates = (field: string) => ({
  bef: (query) => beforeFieldDate(field, query),
  aft: (query) => afterFieldDate(field, query),
  win: (query) => withinFieldDates(field, query),
  in: (query) => withinFieldDates(field, query),
});

export {
  beforeFieldDate,
  afterFieldDate,
  withinFieldDates,
  filterFieldDates,
};
