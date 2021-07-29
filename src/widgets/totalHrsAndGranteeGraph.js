import { Op } from 'sequelize';
import moment from 'moment';
import {
  ActivityReport, ActivityRecipient, Grant, sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

function addOrUpdateResponse(traceIndex, res, xValue, valueToAdd) {
  // If report is missing duration set value to 0.
  let cleanValue = valueToAdd;
  if (cleanValue === null) {
    cleanValue = 0;
  }

  const valueToUse = parseFloat(cleanValue, 10) === 0 ? 0 : parseFloat(cleanValue, 10);

  if (res[traceIndex].x.includes(xValue)) {
    // Update existing Y value.
    const indexToUpdate = res[traceIndex].x.indexOf(xValue);
    res[traceIndex].y[indexToUpdate] += valueToUse;
  } else {
    // Add X value and Update Y value.
    res[traceIndex].x.push(xValue);
    res[traceIndex].y.push(valueToUse);
  }
}

export default async function totalHrsAndGranteeGraph(scopes, query) {
  // Build out return Graph data.
  const res = [
    { name: 'All Dates', x: [], y: [] },
    { name: 'Grantee Rec TTA', x: [], y: [] },
    { name: 'Hours of Training', x: [], y: [] },
    { name: 'Hours of Technical Assistance', x: [], y: [] },
    { name: 'Hours of Both', x: [], y: [] }];

  // Get the Date Range.
  const dateRange = query['startDate.win'];

  if (!dateRange) {
    return res;
  }

  const dates = dateRange.split('-');

  // Parse out Start and End Date.
  let startDate;
  let endDate;

  let useDays = true;
  let multipleYrs = false;

  // Check if we have a Start Date.
  if (dates.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    startDate = dates[0];
  }

  // Check if we have and End Date.
  if (dates.length > 1) {
    // eslint-disable-next-line prefer-destructuring
    endDate = dates[1];
  }

  if (startDate && endDate) {
    // Determine if we have more than 31 days.
    const sdDate = moment(startDate);
    const edDate = moment(endDate);
    const daysDiff = edDate.diff(sdDate, 'days');
    useDays = daysDiff <= 31;

    // Determine if we have more than 1 year in the range.
    // const yearDiff = edDate.diff(sdDate, 'years', true);
    // multipleYrs = yearDiff > 1;
    multipleYrs = moment(sdDate).format('YY') !== moment(edDate).format('YY');
  }

  // Query Approved AR's.
  const reports = await ActivityReport.findAll({
    attributes: [
      'id',
      'startDate',
      'ttaType',
      'duration',
      [sequelize.col('"activityRecipients->grant"."id"'), 'granteeId'],
    ],
    where: {
      [Op.and]: [scopes],
      status: REPORT_STATUSES.APPROVED,

    },
    raw: true,
    includeIgnoreAttributes: false,
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        attributes: [],
        required: false,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: [],
            required: false,
          },
        ],
      },

    ],
    order: [['startDate', 'ASC']],
  });

  const arDates = [];
  const usedDates = [];

  reports.forEach((r) => {
    if (r.startDate && r.startDate !== null) {
      // Get X Axis value to use.
      // eslint-disable-next-line no-nested-ternary
      const xValue = useDays ? moment(r.startDate).format('DD')
        : multipleYrs ? moment(r.startDate).format('MMM-YY') : moment(r.startDate).format('MMM');

      // Grantee Rec TTA (every row).
      if (r.granteeId) {
        addOrUpdateResponse(1, res, xValue, 1);
      }

      // Populate Complete DISTINCT Dates as first data set.
      if (!usedDates.find((cache) => cache.date === xValue)) {
        res[0].x.push(xValue);
        res[0].y.push(null);
        usedDates.push({ date: xValue });
      }

      // Check if we have added this activity report for this date.
      if (!arDates.find((cache) => cache.id === r.id && cache.date === r.startDate)) {
        // Populate Both.
        if ((r.ttaType.includes('training') && r.ttaType.includes('technical-assistance')) || r.ttaType.includes('Both')) {
          addOrUpdateResponse(4, res, xValue, r.duration);
        } else if (r.ttaType.includes('training') || r.ttaType.includes('Training')) {
          // Hours of Training.
          addOrUpdateResponse(2, res, xValue, r.duration);
        } else {
          // Hours of Technical Assistance.
          addOrUpdateResponse(3, res, xValue, r.duration);
        }

        // Populate used AR Id's and Dates.
        arDates.push({ id: r.id, date: r.startDate });
      }
    }
  });

  return res;
}
