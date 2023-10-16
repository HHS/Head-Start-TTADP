import { Op } from 'sequelize';

const fieldDateFilter = (
  isBefore: boolean,
  column: string,
  date: string[],
):object => ({
  [Op.and]: {
    [column]: ((isBefore)
      ? { [Op.lte]: date[0] }
      : { [Op.gte]: date[0] }
    ),
  },
});

const withinFieldDates = (
  column: string,
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
        [column]: {
          [Op.between]: [start, end],
        },
      },
    }
    : {};
};

const filterFieldDates = (column: string) => ({
  bef: (query: string[]) => fieldDateFilter(true, column, query),
  aft: (query: string[]) => fieldDateFilter(false, column, query),
  win: (query: string[]) => withinFieldDates(column, query),
  in: (query: string[]) => withinFieldDates(column, query),
});

export {
  fieldDateFilter,
  withinFieldDates,
  filterFieldDates,
};
