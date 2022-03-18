import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { capitalize } from 'lodash';

import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import BarGraph from './BarGraph';
import './FrequencyGraph.css';

const SORT_ORDER = {
  DESC: 1,
  ALPHA: 2,
};

function sortData(data) {
  const sortedData = [...data];
  /**
   * commenting this out for not since it would need to be tested and for that
   * would need some UI to change sort order
   */
  // if (order === SORT_ORDER.ALPHA) {
  //   sortedData.sort((a, b) => a.topic.localeCompare(b.topic));
  // } else {
  sortedData.sort((a, b) => b.count - a.count);
  // }
  return sortedData;
}

const TOPIC_STR = 'topics';
const REASON_STR = 'reasons';

const HEADINGS = {
  [TOPIC_STR]: ['Topic', 'Count'],
  [REASON_STR]: ['Reason', 'Count'],
};

export function FreqGraph({ data, loading }) {
  // whether to show the data as accessible widget data or not
  const [showAccessibleData, updateShowAccessibleData] = useState(false);
  const [selectedGraph, updateSelectedGraph] = useState(TOPIC_STR);

  const selectedData = data[selectedGraph];
  const sortedData = sortData(selectedData, SORT_ORDER.DESC);
  const accessibleRows = sortedData.map((row) => ({ data: [row.category, row.count] }));

  const columnHeadings = HEADINGS[selectedGraph];
  const toggleGraphLabel = selectedGraph === TOPIC_STR ? REASON_STR : TOPIC_STR;

  // toggle the data table
  function toggleAccessibleData() {
    updateShowAccessibleData((current) => !current);
  }

  function toggleSelectedGraph() {
    updateSelectedGraph((current) => (current === TOPIC_STR ? REASON_STR : TOPIC_STR));
  }

  return (
    <Container className="ttahub--frequency-graph" padding={3} loading={loading} loadingLabel={`${selectedGraph} frequency loading`}>
      <Grid row className="position-relative margin-bottom-2">
        <Grid className="flex-align-self-center desktop:display-flex flex-align-center" desktop={{ col: 'auto' }} mobileLg={{ col: 10 }}>
          <h2 className="display-inline desktop:margin-y-0 margin-left-1" aria-live="polite">
            {capitalize(selectedGraph)}
            {' '}
            in activity reports
          </h2>
          <button
            type="button"
            className="usa-button--unstyled margin-left-2"
            aria-label={`display number of activity reports by ${toggleGraphLabel}`}
            onClick={toggleSelectedGraph}
          >
            {capitalize(toggleGraphLabel)}
            {' '}
            in activity reports
          </button>
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button flex-align-self-center">
          <button
            type="button"
            className="usa-button--unstyled"
            aria-label={showAccessibleData ? `display number of activity reports by ${selectedGraph} data as graph` : `display number of activity reports by ${selectedGraph} data as table`}
            onClick={toggleAccessibleData}
          >
            {showAccessibleData ? 'Display graph' : 'Display table'}
          </button>
        </Grid>
      </Grid>
      { showAccessibleData
        ? (
          <AccessibleWidgetData
            caption={`Number of Activity Reports by ${selectedGraph} Table`}
            columnHeadings={columnHeadings}
            rows={accessibleRows}
          />
        )
        : <BarGraph data={sortedData} xAxisLabel={capitalize(selectedGraph)} yAxisLabel="Number of activity reports" />}
    </Container>
  );
}

FreqGraph.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        topic: PropTypes.string,
        count: PropTypes.number,
      }),
    ), PropTypes.shape({}),
  ]),
  loading: PropTypes.bool.isRequired,
};

FreqGraph.defaultProps = {
  data: { [TOPIC_STR]: [], [REASON_STR]: [] },
};

export default withWidgetData(FreqGraph, 'frequencyGraph');
