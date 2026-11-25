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
// Inclusive YYYY-MM-DD bounds; null means unbounded on that side.
type Interval = { start: string | null; end: string | null };

const ISO_DATE = 'YYYY-MM-DD';

function parseFilterDate(value: string) {
  const date = moment(value, ['YYYY/MM/DD', 'MM/DD/YYYY'], true);
  return date.isValid() ? date.format(ISO_DATE) : null;
}

function filterInterval(condition: string, query: string): Interval | null {
  // These one-sided conditions are separate from the start/end date-range query format.
  if (condition === 'is on or after') {
    const start = parseFilterDate(query);
    return start ? { start, end: null } : null;
  }
  if (condition === 'is on or before') {
    const end = parseFilterDate(query);
    return end ? { start: null, end } : null;
  }
  const [startDate, endDate, ...extra] = query.split('-');
  if (extra.length) return null;
  const start = parseFilterDate(startDate);
  const end = endDate ? parseFilterDate(endDate) : null;
  return start && end && start <= end ? { start, end } : null;
}

function intersect(a: Interval, b: Interval): Interval | null {
  const start = a.start && b.start ? (a.start > b.start ? a.start : b.start) : a.start || b.start;
  const end = a.end && b.end ? (a.end < b.end ? a.end : b.end) : a.end || b.end;
  return start && end && start > end ? null : { start, end };
}

function selectedIntervals(filters: Filter[]): Interval[] {
  // Values sharing a condition are ORed by the start-date scopes; distinct conditions are ANDed.
  const byCondition = new Map<string, Interval[]>();
  filters
    .filter((filter) => filter.topic === 'startDate')
    .forEach((filter) => {
      const queries = Array.isArray(filter.query) ? filter.query : [filter.query];
      const intervals = queries
        .map((query) =>
          typeof query === 'string' ? filterInterval(filter.condition, query) : null
        )
        .filter((interval): interval is Interval => interval !== null);
      if (!intervals.length) return;
      byCondition.set(filter.condition, [
        ...(byCondition.get(filter.condition) || []),
        ...intervals,
      ]);
    });

  return [...byCondition.values()].reduce<Interval[]>(
    (selected, group) =>
      selected
        .flatMap((a) => group.map((b) => intersect(a, b)))
        .filter((interval): interval is Interval => interval !== null),
    [{ start: null, end: null }]
  );
}

function inIntervals(date: string, intervals: Interval[]) {
  return intervals.some(
    (interval) =>
      (!interval.start || date >= interval.start) && (!interval.end || date <= interval.end)
  );
}

function dateRange(intervals: Interval[], hours: HoursRow[]) {
  // Use selected event dates to fill in any bounds not explicitly provided by filters.
  const dates = hours
    .map((row) => row.startDate)
    .filter((date) => moment(date, ISO_DATE, true).isValid() && inIntervals(date, intervals))
    .sort();

  const bound = (values: (string | null)[], fallback: string | undefined, pick: 'min' | 'max') => {
    const hasUnbounded = values.includes(null);
    // With no selected event dates, an unbounded side cannot determine which weeks to display.
    if (hasUnbounded && !fallback) return null;
    const candidates = values.filter((value): value is string => value !== null);
    if (hasUnbounded && fallback) candidates.push(fallback);
    if (!candidates.length) return null;
    candidates.sort();
    return pick === 'min' ? candidates[0] : candidates[candidates.length - 1];
  };

  const start = bound(
    intervals.map((interval) => interval.start),
    dates[0],
    'min'
  );
  const end = bound(
    intervals.map((interval) => interval.end),
    dates[dates.length - 1],
    'max'
  );
  if (!start || !end) return null;
  return { start: moment(start, ISO_DATE), end: moment(end, ISO_DATE) };
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

function weekCell(
  week: number,
  month: moment.Moment,
  intervals: Interval[],
  data: { hours: HoursRow[]; reviews: MonitoringReview[] }
) {
  const first = month.clone().date((week - 1) * 7 + 1);
  const last = week === 5 ? month.clone().endOf('month') : first.clone().add(6, 'days');
  const cell = { start: first.format(ISO_DATE), end: last.format(ISO_DATE) };
  // Clip the cell to the selected intervals so gaps between them stay excluded.
  const ranges = intervals
    .map((interval) => intersect(interval, cell))
    .filter((range): range is { start: string; end: string } => range !== null);
  const matching = data.hours.filter((row: HoursRow) =>
    ranges.some((range) => row.startDate >= range.start && row.startDate <= range.end)
  );
  const hours = matching.reduce((sum: number, row: HoursRow) => sum + Number(row.duration), 0);
  return {
    month,
    hours,
    hasHours: matching.length > 0,
    monitoring: data.reviews.some((review: MonitoringReview) =>
      ranges.some((range) => review.startDate <= range.end && review.endDate >= range.start)
    ),
  };
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
  const intervals = selectedIntervals(filters);
  const range = dateRange(intervals, data.hours);
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
                <span className="margin-right-1">TTA duration (hours):</span>
                {['0', '0.25-3', '3.25-6', '6.25-9', '9.25-12', '12+'].map((label, index) => (
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
                <span className="margin-left-2 margin-right-1">Monitoring:</span>
                <span
                  className="tta-hours-monitoring-key width-6 height-6"
                  role="img"
                  aria-label="Red outline indicates monitoring"
                />
              </div>
              <section
                className="overflow-x-auto"
                aria-label="TTA hours by month and week"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: scroll region needs keyboard focus
                tabIndex={0}
              >
                <span className="usa-sr-only">Use the arrow keys to scroll the heatmap</span>
                <table className="tta-hours-grid width-full border-top-1px border-base-light">
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
                    {[1, 2, 3, 4, 5].map((week) => {
                      const cells = months.map((month) => weekCell(week, month, intervals, data));
                      // A week with no hours is not displayed, even if a monitoring review overlaps it.
                      if (!cells.some((cell) => cell.hasHours)) {
                        return null;
                      }
                      return (
                        <tr key={week}>
                          <th
                            scope="row"
                            className="width-10 text-normal text-right padding-right-05 text-no-wrap"
                          >
                            Week {week}
                          </th>
                          {cells.map((cell) => {
                            const color = COLOR_SCALE[colorLevel(cell.hours)];
                            const monitored = cell.hasHours && cell.monitoring;
                            return (
                              <td
                                key={cell.month.format('YYYY-MM')}
                                className={`height-6 text-center text-bold ${monitored ? 'tta-hours-monitoring' : 'border border-base-light'}`}
                                style={{ background: color.bg, color: color.textColor }}
                                aria-label={`${cell.month.format('MMMM YYYY')}, week ${week}: ${cell.hours.toFixed(1)} hours${monitored ? ', monitoring review' : ''}`}
                              >
                                {cell.hasHours ? cell.hours.toFixed(1) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
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
              </section>
            </div>
          </div>
        )}
      </WidgetContainer>
    </>
  );
}
