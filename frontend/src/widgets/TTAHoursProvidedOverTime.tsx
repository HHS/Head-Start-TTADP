import moment from 'moment';
import React, { useRef, useState } from 'react';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import fetchWidget from '../fetchers/Widgets';
import useFetch from '../hooks/useFetch';
import useMediaCapture from '../hooks/useMediaCapture';
import { filtersToQueryString } from '../utils';
import { COLOR_SCALE as SHARED_COLOR_SCALE } from './FindingCategoryHotspotUtils';
import './TTAHoursProvidedOverTime.css';

const COLOR_SCALE = SHARED_COLOR_SCALE.map((color, index) =>
  index === 3 ? { ...color, textColor: SHARED_COLOR_SCALE[0].textColor } : color
);

const TITLE = 'TTA hours provided over time';
type Filter = { topic: string; condition: string; query: string | number | string[] };
type HoursRow = { startDate: string; duration: number };
type MonitoringReview = { startDate: string; endDate: string };

function dateRange(filters: Filter[], hours: HoursRow[]) {
  const dates = hours
    .map((row) => moment(row.startDate, 'YYYY-MM-DD', true))
    .filter((date) => date.isValid());
  if (!dates.length) return null;

  let lowerBound = null;
  let upperBound = null;
  filters
    .filter((filter) => filter.topic === 'startDate')
    .forEach((filter) => {
      const queries = Array.isArray(filter.query) ? filter.query : [filter.query];
      queries.forEach((query) => {
        if (typeof query !== 'string') return;

        if (filter.condition === 'is on or after') {
          const date = moment(query, ['YYYY/MM/DD', 'MM/DD/YYYY'], true);
          if (date.isValid()) {
            lowerBound = lowerBound ? moment.max(lowerBound, date) : date;
          }
          return;
        }

        if (filter.condition === 'is on or before') {
          const date = moment(query, ['YYYY/MM/DD', 'MM/DD/YYYY'], true);
          if (date.isValid()) {
            upperBound = upperBound ? moment.min(upperBound, date) : date;
          }
          return;
        }

        const [startDate, endDate, ...extra] = query.split('-');
        if (extra.length) return;
        const start = moment(startDate, ['YYYY/MM/DD', 'MM/DD/YYYY'], true);
        const end = moment(endDate, ['YYYY/MM/DD', 'MM/DD/YYYY'], true);
        if (start.isValid() && end.isValid()) {
          lowerBound = lowerBound ? moment.max(lowerBound, start) : start;
          upperBound = upperBound ? moment.min(upperBound, end) : end;
        }
      });
    });

  return {
    start: lowerBound || moment.min(dates),
    end: upperBound || moment.max(dates),
  };
}

function monthsInRange(range: ReturnType<typeof dateRange>) {
  if (!range) return [];
  const start = range.start.clone().startOf('month');
  const count = range.end.clone().startOf('month').diff(start, 'months') + 1;
  if (count < 1) return [];
  return Array.from({ length: count }, (_, index) => start.clone().add(index, 'months'));
}

function colorLevel(value: number) {
  if (value <= 0) return 0;
  if (value <= 3) return 1;
  if (value <= 6) return 2;
  if (value <= 9) return 3;
  if (value <= 12) return 4;
  return 5;
}

export default function TTAHoursProvidedOverTime({ filters }: { filters: Filter[] }) {
  const [showTable, setShowTable] = useState(false);
  const drawerRef = useRef(null);
  const chartRef = useRef(null);
  const capture = useMediaCapture(chartRef, TITLE);
  const widgetFilters = filters.filter((filter) => filter.topic !== 'startDate');
  const query = filtersToQueryString(widgetFilters);
  const { data, loading, error } = useFetch(
    { hours: [] as HoursRow[], reviews: [] as MonitoringReview[] },
    async () => {
      const [hours, reviews] = await Promise.all([
        fetchWidget('ttaHoursProvidedOverTime', query),
        fetchWidget('ttaMonitoringReviewPeriods', query),
      ]);
      return { hours, reviews };
    },
    [query],
    'Unable to load TTA hours provided over time'
  );
  const range = dateRange(filters, data.hours);
  const months = monthsInRange(range);

  const menuItems = showTable
    ? [{ label: 'Display graph', onClick: () => setShowTable(false) }]
    : [
        { label: 'Display table', onClick: () => setShowTable(true) },
        { label: 'Save screenshot', onClick: capture },
      ];

  return (
    <>
      <Drawer title={TITLE} triggerRef={drawerRef}>
        <p>Information about this data will be available soon.</p>
      </Drawer>
      <WidgetContainer
        title={TITLE}
        subtitle={
          <div className="margin-bottom-2">
            <WidgetContainerSubtitle>
              Number of hours spent on TTA activity for a given date, based on AR start date or TR
              session start date
            </WidgetContainerSubtitle>
            <div className="margin-top-1">
              <DrawerTriggerButton drawerTriggerRef={drawerRef}>
                About this data
              </DrawerTriggerButton>
            </div>
          </div>
        }
        loading={loading}
        error={error}
        menuItems={menuItems}
      >
        {error ? null : showTable ? (
          <p className="padding-3">Table view is not yet available.</p>
        ) : (
          <div ref={chartRef} className="tta-hours-chart padding-3">
            <div>
              <div className="display-flex flex-align-center flex-justify-center flex-wrap flex-gap-05 margin-bottom-2">
                <span>TTA duration (hours):</span>
                {['0', '>0-3', '>3-6', '>6-9', '>9-12', '>12'].map((label, index) => (
                  <span
                    key={label}
                    className="tta-hours-legend-cell display-flex flex-align-center flex-justify-center height-6 border border-base-lighter text-bold"
                    style={{
                      background: COLOR_SCALE[index].bg,
                      color: COLOR_SCALE[index].textColor,
                    }}
                  >
                    {label}
                  </span>
                ))}
                <span className="margin-left-2">Monitoring:</span>
                <span
                  className="tta-hours-monitoring-key width-6 height-6"
                  role="img"
                  aria-label="Red outline indicates monitoring"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="tta-hours-grid width-full">
                  <caption className="usa-sr-only">TTA hours by month and week</caption>
                  <thead className="usa-sr-only">
                    <tr>
                      <th scope="col">Week</th>
                      {months.map((month) => (
                        <th scope="col" key={month.format('YYYY-MM')}>
                          {month.format('MMMM YYYY')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((week) => (
                      <tr key={week}>
                        <th scope="row" className="width-10 text-normal text-right padding-right-05 text-no-wrap">
                          Week {week}
                        </th>
                        {months.map((month) => {
                          const first = month.clone().date((week - 1) * 7 + 1);
                          const last =
                            week === 5
                              ? month.clone().endOf('month')
                              : first.clone().add(6, 'days');
                          const firstDate = moment
                            .max(first, range?.start || first)
                            .format('YYYY-MM-DD');
                          const lastDate = moment.min(last, range?.end || last).format('YYYY-MM-DD');
                          const matching = data.hours.filter(
                            (row: HoursRow) => row.startDate >= firstDate && row.startDate <= lastDate
                          );
                          const hours = matching.reduce(
                            (sum: number, row: HoursRow) => sum + Number(row.duration),
                            0
                          );
                          const monitoring = data.reviews.some(
                            (review: MonitoringReview) =>
                              firstDate <= lastDate &&
                              review.startDate <= lastDate &&
                              review.endDate >= firstDate
                          );
                          const color = COLOR_SCALE[colorLevel(hours)];
                          return (
                            <td
                              key={month.format('YYYY-MM')}
                              className={`height-6 text-center text-bold ${monitoring ? 'tta-hours-monitoring' : 'border border-base-light'}`}
                              style={{ background: color.bg, color: color.textColor }}
                              aria-label={`${month.format('MMMM YYYY')}, week ${week}: ${hours.toFixed(1)} hours${monitoring ? ', monitoring review' : ''}`}
                            >
                              {matching.length > 0 ? hours.toFixed(1) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot aria-hidden="true" className="text-center">
                    <tr>
                      <td />
                      {months.map((month) => (
                        <td key={month.format('YYYY-MM')} className="padding-top-05">
                          {month.format('MMM YY')}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </WidgetContainer>
    </>
  );
}
