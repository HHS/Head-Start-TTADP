import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import AccessibleWidgetData from './AccessibleWidgetData';
import BarGraph from './BarGraph';
import DisplayTableToggle from '../components/DisplayTableToggleButton';
import './FrequencyGraph.css';

function sortData(data, isTabular) {
  const sortedData = [...data];
  sortedData.sort((a, b) => b.count - a.count);
  if (!isTabular) {
    sortedData.reverse();
  }
  return sortedData;
}

const TOPIC_STR = 'topics';

const HEADINGS = {
  [TOPIC_STR]: ['Topic', 'Count'],
};

export function FreqGraph({ data, loading }) {
  // whether to show the data as accessible widget data or not
  const [showAccessibleData, updateShowAccessibleData] = useState(false);
  const widgetRef = useRef(null);

  const selectedData = data[TOPIC_STR];
  const sortedData = sortData(selectedData, showAccessibleData);
  const accessibleRows = sortedData.map((row) => ({ data: [row.category, row.count] }));

  const columnHeadings = HEADINGS[TOPIC_STR];

  return (
    <Container className="ttahub--frequency-graph position-relative" loading={loading} loadingLabel="Topics frequency loading">
      <Grid row className="position-relative margin-bottom-2">
        <Grid className="flex-align-self-center desktop:display-flex flex-align-center" desktop={{ col: 'auto' }} mobileLg={{ col: 10 }}>
          <h2 className="display-inline desktop:margin-y-0 margin-left-1" aria-live="polite">
            Topics in activity reports
          </h2>
        </Grid>
        <Grid desktop={{ col: 'auto' }} className="ttahub--show-accessible-data-button flex-align-self-center">
          <DisplayTableToggle
            displayTable={showAccessibleData}
            title="number of activity reports by topics"
            setDisplayTable={updateShowAccessibleData}
          />
        </Grid>
      </Grid>
      { showAccessibleData
        ? (
          <AccessibleWidgetData
            caption="Number of Activity Reports by Topics Table"
            columnHeadings={columnHeadings}
            rows={accessibleRows}
          />
        )
        : (
          <BarGraph
            data={sortedData}
            xAxisLabel="Topics"
            widgetRef={widgetRef}
          />
        )}
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
  data: { [TOPIC_STR]: [] },
};

export default withWidgetData(FreqGraph, 'frequencyGraph');
