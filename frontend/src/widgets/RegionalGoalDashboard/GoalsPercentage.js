import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import withWidgetData from '../withWidgetData';
import colors from '../../colors';
import Container from '../../components/Container';

export function GoalsPercentageWidget({ data, loading }) {
  const percentage = Math.round(data.percentage * 100) / 100;

  return (
    <Grid gap={4} desktop={{ col: 4 }} tablet={{ col: 4 }} mobileLg={{ col: 12 }} className="smart-hub--dashboard-overview-field margin-bottom-1 display-flex">
      <Container paddingX={3} paddingY={3} loading={loading} loadingLabel="total matched goals loading">
        <span className="smart-hub--dashboard-overview-field-icon flex-1 display-flex flex-justify-start flex-align-center">
          <span className="smart-hub--dashboard-overview-field-icon-background display-flex flex-justify-center flex-align-center" style={{ backgroundColor: colors.ttahubMagentaLight }}>
            <FontAwesomeIcon color={colors.ttahubMagenta} icon={faUser} />
          </span>
          <div className="display-flex flex-column flex-justify-start margin-left-4">
            <h2 className="margin-top-0 margin-bottom-1 text-3xl">
              {percentage}
              %
            </h2>
            <div className="font-body-md">
              <span className="">
                {data.numerator}
              </span>
              <span className="">
                {' '}
                <b>Goals</b>
                {' '}
                of
              </span>
              <span className="">
                {' '}
                {data.denominator}
              </span>
            </div>
          </div>
        </span>
      </Container>
    </Grid>
  );
}

GoalsPercentageWidget.propTypes = {
  data: PropTypes.shape({
    numerator: PropTypes.number,
    denominator: PropTypes.number,
    percentage: PropTypes.number,
  }),
  loading: PropTypes.bool.isRequired,
};

GoalsPercentageWidget.defaultProps = {
  data: {
    numerator: 0,
    denominator: 0,
    percentage: 0,
  },
};

export default withWidgetData(GoalsPercentageWidget, 'goalsPercentage');
