import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import TextTrim from '../components/TextTrim';
import {
  buildLegendLabels,
  getColorForValue,
  getTextColorForLevel,
} from './FindingCategoryHotspotUtils';

function HotspotLegend({ max }) {
  const items = buildLegendLabels(max);
  return (
    <div className="finding-category-hotspot-legend margin-bottom-1">
      <span className="finding-category-hotspot-legend-label padding-right-2">
        Frequency of finding categories:
      </span>
      {items.map((item, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="finding-category-hotspot-legend-item">
          <span
            className="finding-category-hotspot-legend-cell"
            style={{
              backgroundColor: item.bg,
              color: item.textColor,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

HotspotLegend.propTypes = {
  max: PropTypes.number.isRequired,
};

export default function HotspotGrid({ rows, months, widgetRef }) {
  const maxCount = useMemo(() => Math.max(0, ...rows.flatMap((r) => r.counts)), [rows]);

  const cellPadding = 'padding-x-2 padding-y-1';

  return (
    <div className="finding-category-hotspot-container margin-3" ref={widgetRef}>
      <HotspotLegend max={maxCount} />
      <section
        className="finding-category-hotspot-scroll margin-bottom-1"
        aria-label="Finding category hotspot"
      >
        <table className="finding-category-hotspot-table">
          <caption className="usa-sr-only">Finding category hotspot</caption>
          <thead>
            <tr className="finding-category-hotspot-axis-row">
              <th
                className={`finding-category-hotspot-first-col finding-category-hotspot-axis-header text-right ${cellPadding}`}
                scope="col"
              >
                Finding category (Top 10)
              </th>
              <th
                className="finding-category-hotspot-axis-header finding-category-hotspot-axis-center text-left padding-x-0 padding-y-1"
                colSpan={months.length}
                scope="colgroup"
              >
                Number of activity reports with finding category
              </th>
              <th
                className={`finding-category-hotspot-total-col finding-category-hotspot-axis-header ${cellPadding}`}
                scope="col"
              >
                Total
              </th>
            </tr>
            <tr className="usa-sr-only">
              <th scope="col">Finding category</th>
              {months.map((m) => (
                <th key={m} scope="col">
                  {m}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th
                  className={`finding-category-hotspot-first-col ${cellPadding}`}
                  title={row.name}
                  scope="row"
                >
                  <TextTrim text={row.name} position="top" />
                </th>
                {row.counts.map((count, i) => {
                  const bg = getColorForValue(count, maxCount);
                  const textColor = getTextColorForLevel(count, maxCount);
                  return (
                    <td
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="finding-category-hotspot-cell font-sans-3xs"
                      style={{ backgroundColor: bg, color: textColor }}
                    >
                      {count || '0'}
                    </td>
                  );
                })}
                <td className="finding-category-hotspot-total-col">{row.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot aria-hidden="true">
            <tr>
              <td className="finding-category-hotspot-first-col finding-category-hotspot-tfoot-label" />
              {months.map((m) => (
                <td key={m} className="finding-category-hotspot-month-footer font-body-2xs">
                  {m}
                </td>
              ))}
              <td className="finding-category-hotspot-total-col" />
            </tr>
          </tfoot>
        </table>
      </section>
      <div className="text-center">Activity report start date</div>
    </div>
  );
}

HotspotGrid.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      counts: PropTypes.arrayOf(PropTypes.number).isRequired,
      total: PropTypes.number.isRequired,
    })
  ).isRequired,
  months: PropTypes.arrayOf(PropTypes.string).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  widgetRef: PropTypes.object.isRequired,
};
