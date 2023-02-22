import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form/dist/index.ie11';
import {
  Button,
  Label,
  FormGroup,
  ErrorMessage,
  Alert,
} from '@trussworks/react-uswds';
import { useHistory } from 'react-router-dom';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import { Helmet } from 'react-helmet';
import { DECIMAL_BASE } from '../../../Constants';
import Container from '../../../components/Container';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import Req from '../../../components/Req';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import { getRecipientGoals } from '../../../fetchers/recipient';
import { createRttapa } from '../../../fetchers/rttapa';
import GoalsToggle from './components/GoalsToggle';

const FormItem = ({
  label, name, required, errors, children,
}) => (
  <FormGroup error={errors[name]}>
    <Label htmlFor={name}>
      {label}
      {required && <Req />}
      <ReactHookFormError
        errors={errors}
        name={name}
        render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
      />
      {children}
    </Label>
  </FormGroup>
);

FormItem.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  required: PropTypes.bool,
  errors: PropTypes.shape({
    message: PropTypes.string,
  }).isRequired,
};

FormItem.defaultProps = {
  required: false,
};

export default function RTTAPA({
  location,
  recipientNameWithRegion,
  recipientId,
  regionId,
}) {
  const {
    control,
    handleSubmit,
    watch,
    register,
    formState,
    setError,
  } = useForm({
    reviewDate: '',
    notes: '',
  });

  const { errors } = formState;
  const reviewDate = watch('reviewDate');
  const history = useHistory();

  /**
   * Get the initial goal ids from the query string
   */
  const initialGoalIds = useMemo(() => {
    const { search } = location;
    const params = new URLSearchParams(search);
    return params.getAll('goalId[]').map((id) => parseInt(id, DECIMAL_BASE));
  }, [location]);

  const [goalIds, setGoalIds] = useState(initialGoalIds);
  const [goals, setGoals] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [showGoals, setShowGoals] = useState(false);

  // update goal ids when goals change
  useEffect(() => {
    if (goals && Array.isArray(goals)) {
      setGoalIds(goals.map((goal) => goal.id));
    }
  }, [goals]);

  useEffect(() => {
    async function getGoals() {
      try {
        const sortConfig = {
          sortBy: 'goalName',
          direction: 'desc',
          offset: 0,
        };

        const { goalRows } = await getRecipientGoals(
          recipientId,
          regionId,
          sortConfig.sortBy,
          sortConfig.direction,
          sortConfig.offset,
          false,
          false,
          goalIds,
        );
        setGoals(goalRows);
      } catch (error) {
        setFetchError('There was an error fetching your goals');
      }
    }

    if (!goals || !goals.length) {
      if (goalIds && goalIds.length) {
        getGoals();
      }
    }
  }, [goalIds, goals, recipientId, regionId]);

  const onSubmit = async (data) => {
    if (!goalIds || !goalIds.length) {
      setError('goalIds', { type: 'required', message: 'Please select at least one goal' });
      return;
    }

    try {
      await createRttapa({
        recipientId,
        regionId,
        reviewDate: data.reviewDate,
        notes: data.notes,
        goalIds,
      });

      // on success redirect to the rttapa history page
      history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/rttapa-history`);
    } catch (error) {
      setFetchError('Sorry, something went wrong');
    }
  };

  const onRemove = (goal) => {
    const newGoals = goals.filter((g) => g.id !== goal.id);
    setGoals(newGoals);
  };

  return (
    <>
      <Helmet>
        <title>
          Create new RTTAPA report for
          {recipientNameWithRegion}
        </title>
      </Helmet>
      <h1 className="page-heading margin-left-2 margin-top-3">{recipientNameWithRegion}</h1>
      <Container className="margin-y-3 margin-left-2">
        <h2>
          Regional TTA plan agreement (RTTAPA)
        </h2>

        <h3>Selected RTTAPA goals</h3>
        { !fetchError ? (
          <GoalsToggle
            goals={goals}
            showGoals={showGoals}
            setShowGoals={setShowGoals}
            goalIds={goalIds}
            onRemove={onRemove}
            recipientId={recipientId}
            regionId={regionId}
          />
        ) : <Alert type="error">{fetchError}</Alert> }

        <h3>RTTAPA details</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <IndicatesRequiredField />
          <FormItem
            label="Review date"
            name="reviewDate"
            errors={errors}
            required
          >
            <ControlledDatePicker
              name="reviewDate"
              value={reviewDate}
              control={control}
              inputId="reviewDate"
            />
          </FormItem>

          <FormItem
            label="Notes"
            name="notes"
            errors={errors}
          >
            <textarea
              id="notes"
              name="notes"
              ref={register()}
              className="usa-textarea"
            />
          </FormItem>

          <input type="hidden" name="goalIds" ref={register()} value={goalIds.join(',')} />

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
  recipientNameWithRegion: PropTypes.string.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired,
    hash: PropTypes.string.isRequired,
    key: PropTypes.string,
  }).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};
