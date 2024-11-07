import { Op } from 'sequelize';
import moment from 'moment';
import { REPORT_STATUSES } from '@ttahub/common';
import { ActivityReport } from '../models';

function addOrUpdateResponse(traceIndex, res, xValue, valueToAdd, month) {
  // If report is missing duration set value to 0.
  let cleanValue = valueToAdd;
  if (cleanValue === null) {
    cleanValue = 0;
  }

  const valueToUse = parseFloat(cleanValue, 10) === 0 ? 0 : parseFloat(cleanValue, 10);

  res?.forEach((responseObject, index) => {
    if (index === traceIndex) {
      if (responseObject.x.includes(xValue)) {
        // Update existing x value.
        const indexToUpdate = res[traceIndex].x.indexOf(xValue);
        // eslint-disable-next-line no-param-reassign
        responseObject.y[indexToUpdate] += valueToUse;
      } else {
        // Add X value, month value, & Y value.
        responseObject.x.push(xValue);
        responseObject.y.push(valueToUse);
        responseObject.month.push(month);
      }
    } else {
      // Add X axis entry with 0 value.
      if (responseObject.x.includes(xValue)) {
        return;
      }
      responseObject.x.push(xValue);
      responseObject.y.push(0);
      responseObject.month.push(month);
    }
  });
}

export default async function totalHrsAndRecipientGraph(scopes, query) {
  // Build out return Graph data.
  const res = [
    {
      name: 'Hours of Training', x: [], y: [], month: [],
    },
    {
      name: 'Hours of Technical Assistance', x: [], y: [], month: [],
    },
    {
      name: 'Hours of Both', x: [], y: [], month: [],
    },
  ];

  // Get the Date Range.
  const dateRange = query['startDate.win'];

  // Parse out Start and End Date.
  let startDate;
  let endDate;
  let useDays = true;
  let multipleYrs = false;

  if (dateRange) {
    const dates = dateRange.split('-');
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
  } else {
    multipleYrs = true;
    useDays = false;
  }

  // Query Approved AR's.
  const reports = await ActivityReport.findAll({
    attributes: [
      'id',
      'startDate',
      'ttaType',
      'duration',
    ],
    where: {
      [Op.and]: [scopes.activityReport],
      calculatedStatus: REPORT_STATUSES.APPROVED,

    },
    raw: true,
    includeIgnoreAttributes: false,
    order: [['startDate', 'ASC']],
  });

  const arDates = [];

  reports?.forEach((r) => {
    if (r.startDate && r.startDate !== null) {
      // Get X Axis value to use.
      let xValue;
      if (useDays) {
        xValue = moment(r.startDate).format('MMM-DD');
      } else if (multipleYrs) {
        xValue = moment(r.startDate).format('MMM-YY');
      } else {
        xValue = moment(r.startDate).format('MMM');
      }

      const month = useDays ? moment(r.startDate).format('MMM') : false;

      // Check if we have added this activity report for this date.
      if (!arDates.find((cache) => cache.id === r.id && cache.date === r.startDate)) {
        // Populate Both.
        if ((r.ttaType.includes('training') && r.ttaType.includes('technical-assistance')) || r.ttaType.includes('Both')) {
          addOrUpdateResponse(2, res, xValue, r.duration, month);
        } else if (r.ttaType.includes('training') || r.ttaType.includes('Training')) {
          // Hours of Training.
          addOrUpdateResponse(0, res, xValue, r.duration, month);
        } else {
          // Hours of Technical Assistance.
          addOrUpdateResponse(1, res, xValue, r.duration, month);
        }

        // Populate used AR Id's and Dates.
        arDates.push({ id: r.id, date: r.startDate });
      }
    }
  });

  return res;
}
