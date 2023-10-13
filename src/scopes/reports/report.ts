import { Op } from 'sequelize';
import { filterFieldDates } from '../helpers/dates';
import { filterEnums } from '../helpers/enum';

const topicToQuery = {
  startDate: filterFieldDates('startDate'),
  endDate: filterFieldDates('endDate'),
  createdAt: filterFieldDates('createdAt'),
  updatedAt: filterFieldDates('updatedAt'),
  status: filterEnums('status'),
};

export {
  topicToQuery,
};
