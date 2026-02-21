import { Op } from 'sequelize';
import { DateTime } from 'luxon';
import { REPORT_STATUSES, TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS } from '@ttahub/common';
import { ActivityReport } from '../models';
import parseDate from '../lib/date';

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

const toDateTime = (value) => {
  const parsedByKnownFormats = parseDate(value);
  if (parsedByKnownFormats) {
    return DateTime.fromJSDate(parsedByKnownFormats);
  }
  return DateTime.fromJSDate(new Date(value));
};

export default async function totalHrsAndRecipientGraph(scopes, query) {
  // Build out return Graph data.
  const res = [
    {
      name: 'Hours of Technical Assistance',
      x: [],
      y: [],
      month: [],
      id: TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS.TECHNICAL_ASSISTANCE,
      trace: 'circle',
    },
    {
      name: 'Hours of Both',
      x: [],
      y: [],
      month: [],
      id: TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS.BOTH,
      trace: 'triangle',
    },
    {
      name: 'Hours of Training',
      x: [],
      y: [],
      month: [],
      id: TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS.TRAINING,
      trace: 'square',
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
    const sdDate = toDateTime(startDate);
    const edDate = toDateTime(endDate);
    const daysDiff = Math.floor(edDate.diff(sdDate, 'days').days);
    useDays = daysDiff <= 31;

    // Determine if we have more than 1 year in the range.
    // const yearDiff = edDate.diff(sdDate, 'years', true);
    // multipleYrs = yearDiff > 1;
    multipleYrs = sdDate.toFormat('yy') !== edDate.toFormat('yy');
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
      const reportDate = toDateTime(r.startDate);
      // Get X Axis value to use.
      let xValue;
      if (useDays) {
        xValue = reportDate.toFormat('LLL-dd');
      } else if (multipleYrs) {
        xValue = reportDate.toFormat('LLL-yy');
      } else {
        xValue = reportDate.toFormat('LLL');
      }

      const month = useDays ? reportDate.toFormat('LLL') : false;

      // Check if we have added this activity report for this date.
      if (!arDates.find((cache) => cache.id === r.id && cache.date === r.startDate)) {
        // Populate Both.
        if (r.ttaType && ((r.ttaType.includes('training') && r.ttaType.includes('technical-assistance')) || r.ttaType.includes('Both'))) {
          addOrUpdateResponse(2, res, xValue, r.duration, month);
        } else if (r.ttaType && (r.ttaType.includes('training') || r.ttaType.includes('Training'))) {
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
