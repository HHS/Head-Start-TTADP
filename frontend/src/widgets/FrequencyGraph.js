import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { capitalize } from 'lodash';

import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import BarGraph from './BarGraph';
import ButtonSelect from '../components/ButtonSelect';
import './FrequencyGraph.css';

const SORT_ORDER = {
  DESC: 1,
  ALPHA: 2,
};

function sortData(data, order) {
  const sortedData = [...data];
  if (order === SORT_ORDER.ALPHA) {
    sortedData.sort((a, b) => a.topic.localeCompare(b.topic));
  } else {
    sortedData.sort((a, b) => b.count - a.count);
  }
  return sortedData;
}

const TOPIC = 0;
const REASON = 1;

const TOPIC_STR = 'topics';
const REASON_STR = 'reasons';

const HEADINGS = {
  [TOPIC]: ['Topic', 'Count'],
  [REASON]: ['Reason', 'Count'],
};

export function FreqGraph({ data, loading }) {
  // whether to show the data as accessible widget data or not
  const [showAccessibleData, updateShowAccessibleData] = useState(false);
  const [selectedGraph, updateSelectedGraph] = useState(TOPIC);
  const selectedGraphString = selectedGraph === TOPIC ? TOPIC_STR : REASON_STR;

  const selectedData = data[selectedGraphString];
  const sortedData = sortData(selectedData, SORT_ORDER.DESC);
  const accessibleRows = sortedData.map((row) => ({ data: [row.category, row.count] }));

  const columnHeadings = HEADINGS[selectedGraph];

  // toggle the data table
  function toggleType() {
    updateShowAccessibleData(!showAccessibleData);
  }

  const onSelectedGraphChange = (e) => {
    updateSelectedGraph(e.value);
  };

  return (
    <Container className="ttahub--frequency-graph" padding={3} loading={loading} loadingLabel={`${selectedGraph} frequency loading`}>
      <Grid row className="position-relative margin-bottom-2">
        <Grid className="flex-align-self-center" desktop={{ col: 'auto' }} mobileLg={{ col: 10 }}>
          <span className="sr-only">
            {selectedGraphString}
            {' '}
            in Activity reports by frequency
          </span>
          <ButtonSelect
            styleAsSelect
            labelId="graphType"
            className="margin-left-1 display-inline-block margin-right-1"
            labelText="Change type of graph"
            ariaName="change graph type menu"
            initialValue={{
              value: TOPIC,
              label: 'Topics',
            }}
            applied={selectedGraph}
            onApply={onSelectedGraphChange}
            options={
              [
                {
                  value: TOPIC,
                  label: 'Topics',
                },
                {
                  value: REASON,
                  label: 'Reasons',
                },
              ]
            }
          />
          <h2 className="display-inline" aria-hidden>
            in Activity Reports by Frequency
          </h2>
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button desktop:margin-y-0 mobile-lg:margin-y-1">
          <button
            type="button"
            className="usa-button--unstyled margin-top-2"
            aria-label={showAccessibleData ? `display number of activity reports by ${selectedGraphString} data as graph` : `display number of activity reports by ${selectedGraphString} data as table`}
            onClick={toggleType}
          >
            {showAccessibleData ? 'Display graph' : 'Display table'}
          </button>
        </Grid>

      </Grid>
      { showAccessibleData
        ? (
          <AccessibleWidgetData
            caption={`Number of Activity Reports by ${selectedGraphString} Table`}
            columnHeadings={columnHeadings}
            rows={accessibleRows}
          />
        )
        : <BarGraph data={sortedData} xAxisLabel={capitalize(selectedGraphString)} yAxisLabel="Number of Activity Reports" />}
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
