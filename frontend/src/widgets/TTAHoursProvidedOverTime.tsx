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
import { COLOR_SCALE } from './FindingCategoryHotspotUtils';
import './TTAHoursProvidedOverTime.css';

const TITLE = 'TTA hours provided over time';
const PERIODS = ['Current year', 'Previous year', 'Last 6 months'] as const;
type Period = (typeof PERIODS)[number];
type Filter = { topic: string; condition: string; query: string | number | string[] };
type HoursRow = { startDate: string; duration: number };
type MonitoringReview = { startDate: string; endDate: string };

function periodMonths(period: Period) {
  const today = moment();
  const start =
    period === 'Previous year'
      ? today.clone().subtract(1, 'year').startOf('year')
      : period === 'Last 6 months'
        ? today.clone().subtract(5, 'months').startOf('month')
        : today.clone().startOf('year');
  const count = period === 'Last 6 months' ? 6 : 12;
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
  const [period, setPeriod] = useState<Period>('Current year');
  const [showTable, setShowTable] = useState(false);
  const drawerRef = useRef(null);
  const chartRef = useRef(null);
  const capture = useMediaCapture(chartRef, TITLE);
  const months = periodMonths(period);
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
        <div className="tta-hours-periods padding-x-3">
          {PERIODS.map((option) => (
            <button
              type="button"
              key={option}
              className={`tta-hours-period ${period === option ? 'tta-hours-period-active' : ''}`}
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {error ? null : showTable ? (
          <p className="padding-3">Table view is not yet available.</p>
        ) : (
          <div ref={chartRef} className="tta-hours-chart padding-3">
            <div>
              <div className="tta-hours-legend margin-bottom-2">
                <span>TTA duration (hours):</span>
                {['0', '>0-3', '>3-6', '>6-9', '>9-12', '>12'].map((label, index) => (
                  <span
                    key={label}
                    className="tta-hours-legend-cell"
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
                  className="tta-hours-monitoring-key"
                  role="img"
                  aria-label="Red outline indicates monitoring"
                />
              </div>
              <div className="tta-hours-scroll">
                <table className="tta-hours-grid">
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
                        <th scope="row">Week {week}</th>
                        {months.map((month) => {
                          const first = month.clone().date((week - 1) * 7 + 1);
                          const last =
                            week === 5
                              ? month.clone().endOf('month')
                              : first.clone().add(6, 'days');
                          const firstDate = first.format('YYYY-MM-DD');
                          const lastDate = last.format('YYYY-MM-DD');
                          const matching = data.hours.filter(
                            (row: HoursRow) =>
                              row.startDate >= firstDate && row.startDate <= lastDate
                          );
                          const hours = matching.reduce(
                            (sum: number, row: HoursRow) => sum + Number(row.duration),
                            0
                          );
                          const monitoring = data.reviews.some(
                            (review: MonitoringReview) =>
                              review.startDate <= lastDate && review.endDate >= firstDate
                          );
                          const color = COLOR_SCALE[colorLevel(hours)];
                          return (
                            <td
                              key={month.format('YYYY-MM')}
                              className={monitoring ? 'tta-hours-monitoring' : ''}
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
                  <tfoot aria-hidden="true">
                    <tr>
                      <td />
                      {months.map((month) => (
                        <td key={month.format('YYYY-MM')}>
                          {month.format(period === 'Last 6 months' ? 'MMM YY' : 'MMM')}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
              {period !== 'Last 6 months' && (
                <div className="text-center text-bold margin-top-1">{months[0].format('YYYY')}</div>
              )}
            </div>
          </div>
        )}
      </WidgetContainer>
    </>
  );
}
