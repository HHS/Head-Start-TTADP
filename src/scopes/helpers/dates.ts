import { Op } from 'sequelize';

const beforeFieldDate = (
  field: string,
  date: string[],
):object => ({
  [Op.and]: {
    [`data.${field}`]: {
      [Op.lte]: date[0],
    },
  },
});

const afterFieldDate = (
  field: string,
  date: string[],
):object => ({
  [Op.and]: {
    [`data.${field}`]: {
      [Op.gte]: date[0],
    },
  },
});

const withinFieldDates = (
  field: string,
  dates: string[],
):object => {
  const [
    start,
    end,
  ] = dates[0].includes(' - ')
    ? dates[0].split(' - ')
    : dates[0].split('-');

  return (start && end)
    ? {
      [Op.and]: {
        [`data.${field}`]: {
          [Op.between]: [start, end],
        },
      },
    }
    : {};
};

const filterFieldDates = (field: string) => ({
  bef: (query: string[]) => beforeFieldDate(field, query),
  aft: (query: string[]) => afterFieldDate(field, query),
  win: (query: string[]) => withinFieldDates(field, query),
  in: (query: string[]) => withinFieldDates(field, query),
});

export {
  beforeFieldDate,
  afterFieldDate,
  withinFieldDates,
  filterFieldDates,
};
