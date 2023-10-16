import { Op } from 'sequelize';
import { REPORT_TYPE } from '../../constants';
import { filterFieldDates } from '../helpers/dates';
import { filterTableEnums } from '../helpers/enum';
import { filterAssociation } from '../helpers/utils';

// SQL query to select the report ID from the "Reports" table based on the report type
const reportTypeSql = `SELECT
    r.id
  FROM "Reports" r
  INNER JOIN "ValidFor" vf
  ON r."reportTypeId" = vf.id
  WHERE vf.name`;

// Function to create a filter for report types
const reportTypeFilter = (
  includes: boolean, // Whether to include or exclude the report types
  reportTypes: (typeof REPORT_TYPE[keyof typeof REPORT_TYPE]), // Array of report types
) => ({
  [Op.and]: [
    filterAssociation(
      reportTypeSql,
      reportTypes,
      {
        // Negate the value of 'includes' to exclude report types if 'includes' is false
        exclude: !includes,
        comparator: '=',
      },
    ),
  ],
});

// Function to create a filter object for report types
const filterReportType = () => ({
  in: (query) => reportTypeFilter(true, query), // Include report types in the query
  nin: (query) => reportTypeFilter(false, query), // Exclude report types from the query
});

// SQL query to select the report ID from the "Reports" table based on the report status
const reportStatusSql = (
  reportTypes: (typeof REPORT_TYPE[keyof typeof REPORT_TYPE])[], // Array of report types
  isStatusaNumber: boolean, // Whether the status is a number or not
) => ((isStatusaNumber)
  ? `SELECT
    r.id
  FROM "Reports" r
  INNER JOIN "ValidFor" vf
  ON r."reportTypeId" = vf.id
  WHERE ${
  reportTypes.length > 1
    ? `vf.name in (${reportTypes.map((rt) => `'${rt}'`).join(', ')})`
    : `vf.name = '${reportTypes[0]}'`
  }
  AND r."statusId"`
  : `SELECT
    r.id
  FROM "Reports" r
  INNER JOIN "ValidFor" vf
  ON r."reportTypeId" = vf.id
  INNER JOIN "Statuses" s
  ON r."statusId" = s.id
  WHERE ${
  reportTypes.length > 1
    ? `vf.name in (${reportTypes.map((rt) => `'${rt}'`).join(', ')})`
    : `vf.name = '${reportTypes[0]}'`
  }
  AND s.name`
);

// Function to create a filter for report statuses
const reportStatusFilter = (
  includes: boolean, // Whether to include or exclude the report statuses
  reportTypes: (typeof REPORT_TYPE[keyof typeof REPORT_TYPE])[], // Array of report types
  statuses: (string | number)[], // Array of report statuses (strings or numbers), should be 1 type
) => ({
  [Op.and]: [
    filterAssociation(
      reportStatusSql(
        reportTypes,
        statuses.every((status) => typeof status === 'number'), // Check if all statuses are numbers
      ),
      statuses,
      {
        // Negate the value of 'includes' to exclude report statuses if 'includes' is false
        exclude: !includes,
        comparator: '=',
      },
    ),
  ],
});

// Function to create a filter object for report statuses
const filterReportStatus = (
  reportTypes: (typeof REPORT_TYPE[keyof typeof REPORT_TYPE])[], // Array of report types
) => ({
  in: (query) => reportStatusFilter(true, reportTypes, query),
  nin: (query) => reportStatusFilter(false, reportTypes, query),
});

/**
 * Maps topic filters to corresponding filter functions.
 *
 * @param reportTypes - Array of report types
 * @returns Object containing filter functions for each topic
 */
const topicToQuery = (
  reportTypes: (typeof REPORT_TYPE[keyof typeof REPORT_TYPE])[], // Array of report types
) => ({
  type: filterReportType(), // Filter for report types
  startDate: filterFieldDates('startDate'), // Filter for start date
  endDate: filterFieldDates('endDate'), // Filter for end date
  createdAt: filterFieldDates('createdAt'), // Filter for creation date
  updatedAt: filterFieldDates('updatedAt'), // Filter for update date
  status: filterReportStatus(reportTypes), // Filter for report statuses
});

export {
  reportTypeSql,
  reportTypeFilter,
  filterReportType,
  reportStatusSql,
  reportStatusFilter,
  filterReportStatus,
  topicToQuery,
};
