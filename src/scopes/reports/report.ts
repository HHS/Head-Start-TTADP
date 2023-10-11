import { Op } from 'sequelize';
import { filterFieldDates } from '../helpers/dates';

const topicToQuery = {
  startDate: filterFieldDates('startDate'),
  endDate: filterFieldDates('endDate'),
  createdAt: filterFieldDates('createdAt'),
  updatedAt: filterFieldDates('updatedAt'),
};

export {
  topicToQuery,
};
