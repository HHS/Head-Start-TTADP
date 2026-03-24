import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { kebabCase } from 'lodash';
import LineGraph from './LineGraph';
import WidgetContainer from '../components/WidgetContainer';
import useMediaCapture from '../hooks/useMediaCapture';
import { arrayExistsAndHasLength, NOOP } from '../Constants';
import useWidgetExport from '../hooks/useWidgetExport';

export default function LineGraphWidget({
  title,
  subtitle,
  exportName,
  data,
  hideYAxis,
  xAxisTitle,
  yAxisTitle,
  yAxisTickStep,
  legendConfig,
  tableTitle,
  tableFirstHeading,
  tableCaption,
  drawerConfig,
}) {
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, exportName);
  const [showTabularData, setShowTabularData] = useState(false);
  const [columnHeadings, setColumnHeadings] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  // eslint-disable-next-line max-len
  const hasData = useMemo(() => data && data.length && data.some((d) => d.x.length > 0, []), [data]);

  const { exportRows } = useWidgetExport(
    tableRows,
    columnHeadings,
    [],
    tableTitle,
    exportName,
  );

  useEffect(() => {
    if (!arrayExistsAndHasLength(data)) {
      return;
    }

    const headings = data[0].x.map((x, index) => {
      if (data[0].month[index]) {
        return `${data[0].month[index]} ${x}`;
      }
      return x;
    });

    const rows = data.map((row) => ({
      heading: row.name,
      data: row.y.map((y) => ({
        title: row.name,
        value: `${(Math.round(y * 10) / 10).toString()}`,
      })),
    }));

    setColumnHeadings(headings);
    setTableRows(rows);
  }, [data]);

  const titleSlug = kebabCase(title) || 'line-graph';

  const menuItems = [{
    label: showTabularData ? 'Display graph' : 'Display table',
    onClick: () => setShowTabularData(!showTabularData),
  }];

  if (showTabularData) {
    menuItems.push({
      label: 'Export table data',
      onClick: () => exportRows('all'),
      id: `rd-${titleSlug}-export-table-data`,
    });
  }

  if (!showTabularData) {
    menuItems.push({
      label: 'Save screenshot',
      onClick: capture,
      id: `rd-${titleSlug}-save-screenshot`,
    });
  }

  return (
    <WidgetContainer
      loading={false}
      title={title}
      subtitle={subtitle}
      showHeaderBorder
      menuItems={hasData ? menuItems : []}
    >
      <LineGraph
        showTabularData={showTabularData}
        data={data}
        hideYAxis={hideYAxis}
        xAxisTitle={xAxisTitle}
        yAxisTitle={yAxisTitle}
        yAxisTickStep={yAxisTickStep}
        legendConfig={legendConfig}
        tableConfig={{
          data: tableRows,
          title: tableTitle,
          firstHeading: tableFirstHeading,
          caption: tableCaption,
          enableCheckboxes: false,
          enableSorting: false,
          showTotalColumn: false,
          requestSort: NOOP,
          headings: columnHeadings,
          footer: {
            showFooter: false,
          },
        }}
        widgetRef={widgetRef}
        drawerConfig={drawerConfig}
      />
    </WidgetContainer>
  );
}

LineGraphWidget.propTypes = {
  title: PropTypes.string.isRequired,
  exportName: PropTypes.string.isRequired,
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        x: PropTypes.arrayOf(PropTypes.string),
        y: PropTypes.arrayOf(PropTypes.number),
      }),
    ),
    PropTypes.shape({}),
  ]),
  hideYAxis: PropTypes.bool,
  xAxisTitle: PropTypes.string.isRequired,
  yAxisTitle: PropTypes.string.isRequired,
  yAxisTickStep: PropTypes.number,
  legendConfig: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    selected: PropTypes.bool.isRequired,
    shape: PropTypes.oneOf(['circle', 'triangle', 'square']).isRequired,
    id: PropTypes.string.isRequired,
    traceId: PropTypes.string.isRequired,
  })).isRequired,
  tableTitle: PropTypes.string,
  tableFirstHeading: PropTypes.string,
  tableCaption: PropTypes.string,
  subtitle: PropTypes.string,
  drawerConfig: PropTypes.shape({
    title: PropTypes.string,
    tagName: PropTypes.string,
  }),
};

LineGraphWidget.defaultProps = {
  data: [],
  hideYAxis: false,
  yAxisTickStep: null,
  tableTitle: 'TTA Provided',
  tableFirstHeading: 'TTA Provided',
  tableCaption: 'Total TTA hours by date and type',
  subtitle: '',
  drawerConfig: {
    title: 'QA dashboard filters',
    tagName: 'ttahub-qa-dash-filters',
  },
};
