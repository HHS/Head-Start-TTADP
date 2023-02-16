import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import {
  Button,
  Label,
  Textarea,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  // faAngleUp,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../../../colors';
import { DECIMAL_BASE } from '../../../Constants';
import Container from '../../../components/Container';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import Req from '../../../components/Req';
import DatePicker from '../../../components/DatePicker';

export default function RTTAPA({ location }) {
  const { handleSubmit } = useForm();

  /**
     * Get the initial goal ids from the query string
     */
  const initialGoalIds = useMemo(() => {
    const { search } = location;
    const params = new URLSearchParams(search);
    return params.getAll('goalId[]').map((id) => parseInt(id, DECIMAL_BASE));
  }, [location]);

  const [initialGoalsFetched] = useState(false);
  const [goalIds] = useState(initialGoalIds);

  useEffect(() => {
    if (!initialGoalsFetched) {
      if (goalIds && goalIds.length) {
      // fetch goals for rttapa
      }
    }
  }, [goalIds, initialGoalsFetched]);

  const onSubmit = () => {};

  return (
    <>
      <h1 className="page-heading">Recipient name</h1>
      <Container className="margin-y-3 margin-left-2">
        <h2>
          Regional TTA plan agreement (RTTAPA)
        </h2>

        <h3>Selected RTTAPA goals</h3>
        <Button
          type="button"
          className="usa-button--outline usa-button text-no-underline text-middle tta-smarthub--goal-row-objectives tta-smarthub--goal-row-objectives-enabled"
          onClick={() => {}}
        >
          View goals
          {goalIds > 1 ? 's' : ''}
          <strong className="margin-left-1">
            (
            {goalIds.length}
            )
          </strong>
          <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={faAngleDown} />
        </Button>

        <h3>RTTAPA details</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <IndicatesRequiredField />
          <Label>
            Review Date
            <Req />
            <DatePicker />
          </Label>

          <Label>
            Notes
            <Textarea name="notes" />
          </Label>

          <div className="margin-top-3">
            <Button type="submit">Submit</Button>
            <Button type="button" outline>Cancel</Button>
          </div>
        </form>
      </Container>
    </>
  );
}

RTTAPA.propTypes = {
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired,
    hash: PropTypes.string.isRequired,
    key: PropTypes.string,
  }).isRequired,
};
