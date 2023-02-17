import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form/dist/index.ie11';
import {
  Button,
  Label,
  FormGroup,
  ErrorMessage,
} from '@trussworks/react-uswds';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleUp,
  faAngleDown,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../../../colors';
import { DECIMAL_BASE } from '../../../Constants';
import Container from '../../../components/Container';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import Req from '../../../components/Req';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import { getRecipientGoals } from '../../../fetchers/recipient';
import GoalCard from '../../../components/GoalCards/GoalCard';

const FormItem = ({
  label, name, required, errors, children,
}) => (
  <FormGroup error={errors[name]}>
    <Label>
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
  const [showGoals, setShowGoals] = useState(false);

  // update goal ids when goals change
  useEffect(() => {
    if (goals && goals.length) {
      setGoalIds(goals.map((goal) => goal.id));
    }
  }, [goals]);

  useEffect(() => {
    async function getGoals() {
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
        {},
        goalIds,
      );
      setGoals(goalRows);
    }

    if (!goals || !goals.length) {
      if (goalIds && goalIds.length) {
        getGoals();
      }
    }
  }, [goalIds, goals, recipientId, regionId]);

  const onSubmit = (data) => {
    if (!goalIds || !goalIds.length) {
      setError('goalIds', { type: 'required', message: 'Please select at least one goal' });
      return;
    }

    // eslint-disable-next-line no-console
    console.log(data);
  };

  const onRemove = (goal) => {
    const newGoals = goals.filter((g) => g.id !== goal.id);
    setGoals(newGoals);
  };

  return (
    <>
      <h1 className="page-heading margin-left-2">{recipientNameWithRegion}</h1>
      <Container className="margin-y-3 margin-left-2">
        <h2>
          Regional TTA plan agreement (RTTAPA)
        </h2>

        <h3>Selected RTTAPA goals</h3>
        <Button
          type="button"
          className="usa-button--outline usa-button text-no-underline text-middle tta-smarthub--goal-row-objectives tta-smarthub--goal-row-objectives-enabled"
          onClick={() => {
            setShowGoals(!showGoals);
          }}
        >
          View goals
          {goalIds > 1 ? 's' : ''}
          <strong className="margin-left-1">
            (
            {goalIds.length}
            )
          </strong>
          <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.ttahubMediumBlue} icon={showGoals ? faAngleUp : faAngleDown} />
        </Button>

        { showGoals && (
          goals.map((goal) => (
            <div className="display-flex flex-align">
              <GoalCard
                goal={goal}
                recipientId={recipientId}
                regionId={regionId}
                showCloseSuspendGoalModal={false}
                performGoalStatusUpdate={false}
                handleGoalCheckboxSelect={false}
                hideCheckbox
                showReadOnlyStatus
                isChecked={false}
                hideGoalOptions
                marginX={0}
                marginY={2}
              />
              <Button
                type="button"
                onClick={() => {
                  onRemove(goal);
                }}
                className="flex-align-self-center"
                unstyled
              >
                <FontAwesomeIcon className="margin-left-1 margin-top-2" color={colors.textInk} icon={faTrashCan} />
              </Button>
            </div>
          ))
        )}

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
