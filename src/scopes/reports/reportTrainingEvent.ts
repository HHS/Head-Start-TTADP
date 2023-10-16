import { Op } from 'sequelize';
import { filterAssociation } from '../helpers/utils';
import { filterTableEnums, filterValueEnums } from '../helpers/enum';
import { filterNumerics } from '../helpers/numeric';

// SQL query to select the report ID from the "Reports" table based on the report type
const regionsSql = `SELECT
    rte."reportId"
  FROM "ReportTrainingEvents" rte
  WHERE rte."regionId"`;

// Function to create a filter for report types
const regionsFilter = (
  includes: boolean, // Whether to include or exclude the report types
  regions: number[],
) => ({
  [Op.and]: [
    filterAssociation(
      regionsSql,
      regions,
      {
        // Negate the value of 'includes' to exclude report types if 'includes' is false
        exclude: !includes,
        comparator: 'in',
      },
    ),
  ],
});

// Function to create a filter object for report types
const filterRegions = () => ({
  in: (query) => regionsFilter(true, query), // Include report types in the query
  nin: (query) => regionsFilter(false, query), // Exclude report types from the query
});

const topicToQuery = {
  region: filterRegions(),
  eventId: undefined, // TODO
  name: undefined, // TODO
  organizer: filterTableEnums('organizer'),
  trainingType: filterValueEnums('reportTrainingEvent', 'trainingType'),
  vision: undefined, // TODO
};

export {
  regionsSql,
  regionsFilter,
  filterRegions,
  topicToQuery,
};
