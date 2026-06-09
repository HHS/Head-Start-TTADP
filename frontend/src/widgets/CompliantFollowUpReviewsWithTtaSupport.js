import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import AppLoadingContext from '../AppLoadingContext';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';
import Drawer from '../components/Drawer';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import WidgetContainer from '../components/WidgetContainer';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';
import colors from '../colors';
import useMediaCapture from '../hooks/useMediaCapture';
import useSize from '../hooks/useSize';
import useWidgetMenuItems from '../hooks/useWidgetMenuItems';
import HorizontalTableWidget from './HorizontalTableWidget';
import withWidgetData from './withWidgetData';
import './CompliantFollowUpReviewsWithTtaSupport.css';
import NoResultsFound from '../components/NoResultsFound';

let Plot = null;
import('plotly.js-basic-dist').then((Plotly) => {
  Plot = createPlotlyComponent(Plotly);
});

const SERIES_COLORS = [
  colors.ttahubMediumBlue,
  colors.ttahubOrange,
  colors.ttahubMediumDeepTeal,
];

function CompliantReviewsGrid({ data, widgetRef }) {
  const [plotData, setPlotData] = useState(null);
  const size = useSize(widgetRef);

  useEffect(() => {
    if (!data || !size) return;
    const { months, reviews } = data;
    // Exclude Total; put "with TTA" first so "without TTA" renders on top in stacked mode
    const filtered = (reviews || []).filter((s) => !/total/i.test(s.name));
    const withTta = filtered.filter((s) => /with tta/i.test(s.name));
    const withoutTta = filtered.filter((s) => !/with tta/i.test(s.name));
    const ordered = [...withTta, ...withoutTta];
    const traces = ordered.map((series, i) => ({
      type: 'bar',
      name: series.name,
      x: months,
      y: series.values,
      text: series.values.map((v) => (v > 0 ? v.toString() : '')),
      textposition: 'inside',
      insidetextanchor: 'middle',
      textfont: { color: i === 0 ? '#fff' : colors.baseDarkest, size: 10 },
      marker: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
      hovertemplate: '%{y}<extra></extra>',
      hoverlabel: {
        bgcolor: colors.baseDarkest,
        bordercolor: colors.baseDarkest,
        font: { color: '#fff', size: 16 },
      },
    }));

    setPlotData({
      traces,
      layout: {
        barmode: 'stack',
        height: 350,
        width: size.width,
        margin: { l: 90, r: 20, t: 20, b: 80 },
        font: { color: colors.baseDarkest },
        xaxis: { automargin: true, title: { text: 'Follow-up review received date', font: { family: 'Source Sans Pro, sans-serif', size: 16 } } },
        yaxis: {
          tickformat: ',.0d',
          autorange: true,
          title: { text: 'Compliant follow-up reviews', font: { family: 'Source Sans Pro, sans-serif', size: 16 } },
        },
        showlegend: false,
      },
      config: { responsive: true, displayModeBar: false },
    });
  }, [data, size]);

  return (
    <div ref={widgetRef} className="padding-3">
      {plotData && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '8px',
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: '16px',
            }}
          >
            {plotData.traces.map((trace) => (
              <div
                key={trace.name}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '4px',
                    backgroundColor: trace.marker.color,
                    flexShrink: 0,
                  }}
                />
                <span>{trace.name}</span>
              </div>
            ))}
          </div>
          <Plot data={plotData.traces} layout={plotData.layout} config={plotData.config} />
        </>
      )}
    </div>
  );
}

CompliantReviewsGrid.propTypes = {
  data: PropTypes.shape({
    months: PropTypes.arrayOf(PropTypes.string),
    reviews: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.number),
      })
    ),
  }).isRequired,
  widgetRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};

const EXPORT_NAME = 'Compliant follow-up reviews with TTA support';

export function CompliantFollowUpReviewsWithTtaSupport({ loading, data }) {
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const drawerTriggerRef = useRef(null);
  const widgetRef = useRef(null);
  const capture = useMediaCapture(widgetRef, EXPORT_NAME);
  const [showTabularData, setShowTabularData] = useState(false);

  useEffect(() => {
    setIsAppLoading(loading);
  }, [loading, setIsAppLoading]);

  const months = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.months;
  }, [data]);

  // Build rows for HorizontalTableWidget (table view / export)
  const tableData = useMemo(() => {
    return (
      data?.reviews?.map((row) => ({
        heading: row.name,
        id: row.name,
        tooltip: true,
        hideSortingIndicator: true,
        data: [
          ...row.values.map((value) => ({
            value: value.toString(),
          })),
          {
            value: row.values.reduce((sum, v) => sum + Number(v), 0).toString(),
          },
        ],
      })) || []
    );
  }, [data]);

  // Placeholder menu items until export is implemented
  // const { exportRows } = useWidgetExport(
  //     tableData,
  //     [...months, 'Total'],
  //     {},
  //     'Finding category',
  //     EXPORT_NAME
  //   );

  const menuItems = useWidgetMenuItems(
    showTabularData,
    setShowTabularData,
    capture,
    {}
    // exportRows
  );

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Compliant follow-up reviews, broken out by those with and without citations addressed by
        approved activity reports during the correction period.
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
    </div>
  );

  const showEmptyState = loading || !data || data.length === 0;

  if (showEmptyState) {
    return (
      <>
        <Drawer triggerRef={drawerTriggerRef} title="Compliant Follow-up Reviews with TTA Support">
          <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews-with-tta-support" />
        </Drawer>
        <WidgetContainer
          title="Compliant Follow-up Reviews with TTA Support"
          subtitle={subtitle}
          menuItems={[]}
          loading={loading}
          titleMargin={{ bottom: 1 }}
        >
          <NoResultsFound
            drawerConfig={{
              tagName: 'ttahub-regional-dash-monitoring-filters',
              title: 'Monitoring dashboard filters',
            }}
          />
        </WidgetContainer>
      </>
    );
  }

  return (
    <>
      <Drawer triggerRef={drawerTriggerRef} title="Compliant Follow-up Reviews with TTA Support">
        <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews-with-tta-support" />
      </Drawer>
      <WidgetContainer
        title="Compliant Follow-up Reviews with TTA Support"
        subtitle={subtitle}
        menuItems={menuItems}
        loading={loading}
        titleMargin={{ bottom: 1 }}
      >
        {showTabularData ? (
          <HorizontalTableWidget
            headers={months}
            data={tableData}
            caption="Compliant Follow-up Reviews"
            firstHeading="Follow-up reviews"
            lastHeading="Totals"
            showTotalColumn
            stickyFirstColumn
            stickyLastColumn
            enableCheckboxes={false}
            selectAllIdPrefix="compliant-follow-up-reviews"
            hideFirstColumnBorder
            footerData={false}
          />
        ) : (
          <CompliantReviewsGrid data={data} widgetRef={widgetRef} />
        )}
      </WidgetContainer>
    </>
  );
}

CompliantFollowUpReviewsWithTtaSupport.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

CompliantFollowUpReviewsWithTtaSupport.defaultProps = {
  data: [],
};

export default withWidgetData(
  CompliantFollowUpReviewsWithTtaSupport,
  'compliantFollowUpReviewsWithTtaSupport'
);
