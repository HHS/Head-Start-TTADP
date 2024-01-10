import React, {
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  StepIndicatorStep,
  Button,
  Checkbox,
  Alert,
  ModalToggleButton,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { DECIMAL_BASE } from '@ttahub/common/src/constants';
import Container from '../../../../components/Container';
import StepIndicator from '../../../../components/StepIndicator';
import { getRecipientGoals } from '../../../../fetchers/recipient';
import { mergeGoals } from '../../../../fetchers/goals';
import './index.css';
import GoalCard from './components/GoalCard';
import FinalGoalCard from './components/FinalGoalCard';
import AppLoadingContext from '../../../../AppLoadingContext';
import GoalMergeGuidanceDrawer from './components/GoalMergeGuidanceDrawer';
import Modal from '../../../../components/VanillaModal';
import useSocket, { usePublishWebsocketLocationOnInterval } from '../../../../hooks/useSocket';
import UserContext from '../../../../UserContext';
import SocketAlert from '../../../../components/SocketAlert';
import isAdmin from '../../../../permissions';

const OFFSET = 0;
const SELECT_GOALS_TO_MERGE = 1;
const SELECT_GOALS_TO_KEEP = 2;
const REVIEW_AND_MERGE = 3;

const pages = [
  SELECT_GOALS_TO_MERGE,
  SELECT_GOALS_TO_KEEP,
  REVIEW_AND_MERGE,
];

const validations = {
  [SELECT_GOALS_TO_KEEP]: {
    validator: (hookForm) => {
      const { finalGoalId } = hookForm.getValues();
      if (!finalGoalId) {
        return false;
      }
      return true;
    },
    message: 'One goal must be selected.',
  },
  [SELECT_GOALS_TO_MERGE]: {
    validator: (hookForm) => {
      const { selectedGoalIds } = hookForm.getValues();
      if (selectedGoalIds.length < 2) {
        return false;
      }
      return true;
    },
    message: 'At least 2 goals must be selected.',
  },
};

const steps = [
  {
    position: SELECT_GOALS_TO_MERGE,
    label: 'Select goals to merge',
  },
  {
    position: SELECT_GOALS_TO_KEEP,
    label: 'Select goal to keep',
  },
  {
    position: REVIEW_AND_MERGE,
    label: 'Review merged goal',
  },
];

const stepIndicatorStatus = (position, activePage) => {
  if (position === activePage) {
    return 'current';
  }

  if (position < activePage) {
    return 'complete';
  }

  return 'incomplete';
};

const INTERVAL_DELAY = 2500;

export const navigate = (newPage, setActivePage) => {
  if (!pages.includes(newPage)) {
    return;
  }

  setActivePage(newPage);
  window.scrollTo(0, 0);
};

export default function MergeGoals({
  location,
  recipientId,
  regionId,
  recipientNameWithRegion,
  canMergeGoals,
}) {
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const [goals, setGoals] = useState([]);
  const [activePage, setActivePage] = useState(SELECT_GOALS_TO_MERGE);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);
  const drawerTriggerRef = useRef(null);
  const modalRef = useRef();

  const hookForm = useForm({
    mode: 'onSubmit',
    defaultValues: {
      selectedGoalIds: [],
      finalGoalId: null,
    },
  });

  const { register, watch } = hookForm;
  const selectedGoalIds = watch('selectedGoalIds');
  const finalGoalId = watch('finalGoalId');

  const history = useHistory();

  const {
    socket,
    setSocketPath,
    socketPath,
    messageStore,
  } = useSocket(user);

  useEffect(() => {
    const newPath = `/merge-goals/${new URLSearchParams(location.search).toString()}&recipientId=${recipientId}&regionId=${regionId}`;
    setSocketPath(newPath);
  }, [location.search, recipientId, regionId, setSocketPath]);

  usePublishWebsocketLocationOnInterval(
    socket,
    socketPath,
    user,
    Date.now().toString(),
    INTERVAL_DELAY,
  );

  useEffect(() => {
    async function fetchGoals() {
      const goalIds = new URLSearchParams(location.search).getAll('goalId[]');

      if (!goalIds.length || goalIds.length < 2) {
        setError('No goal ids provided');
        return;
      }

      try {
        setError('');
        setIsAppLoading(true);
        // this might seem a weird place for this but I've found that
        // putting it in its own useEffect or even outside of this function
        // causes this message to briefly be displayed
        // we put it here so that it gets swept up in the rendering passes
        // without ever being visible
        if (!canMergeGoals) {
          setError('You do not have permission to merge goals for this recipient');
        }
        const { goalRows } = await getRecipientGoals(
          recipientId,
          regionId,
          'goal',
          'asc',
          OFFSET,
          false,
          false,
          goalIds,
        );
        setGoals(goalRows);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError('Unable to fetch goals');
      } finally {
        // remove loading screen
        setIsAppLoading(false);
      }
    }

    fetchGoals();
  }, [location.search, recipientId, regionId, setIsAppLoading, canMergeGoals]);

  const selectedGoals = goals.filter((g) => (
    selectedGoalIds.includes(g.ids.join(','))
  ));

  const selectedGoalsIncludeCurated = selectedGoals.some((g) => g.isCurated);

  useEffect(() => {
    // if we aren't on the second page, or we already have a finalGoalId
    // then we don't need to do anything
    if (activePage !== SELECT_GOALS_TO_KEEP || finalGoalId) {
      return;
    }

    // if we have a single curated goal selected, then we should set it as the final goal
    const curatedSelectedGoals = goals.filter((g) => (
      selectedGoalIds.includes(g.ids.join(',')) && g.isCurated
    ));

    if (curatedSelectedGoals.length === 1) {
      hookForm.setValue('finalGoalId', curatedSelectedGoals[0].ids.join(','));
    } else if (curatedSelectedGoals.length > 1) {
      if (isAdmin(user) || (user.flags && user.flags.includes('closed_goal_merge_override'))) {
        // use the highest goal id as the finalGoalId, because it is the latest
        curatedSelectedGoals.sort((a, b) => b.id - a.id);
        const maxGoalIds = curatedSelectedGoals[0].ids.join(',');
        hookForm.setValue('finalGoalId', maxGoalIds);
      }
    }
  }, [activePage, finalGoalId, goals, hookForm, selectedGoalIds, user]);

  if (error) {
    return (
      <Alert type="error" headingLevel="h2" heading={<>Something went wrong</>}>
        <span className="usa-prose">{error}</span>
      </Alert>
    );
  }

  const selectAll = (checked) => {
    let newSelectedGoalIds = [];
    if (checked) {
      newSelectedGoalIds = goals.map((g) => g.ids.join(','));
    }

    hookForm.setValue('selectedGoalIds', newSelectedGoalIds);
  };

  const onContinue = (e) => {
    e.preventDefault();

    // clear out validation
    setValidation('');
    const { validator, message } = validations[activePage];
    const isValid = validator(hookForm);

    if (!isValid) {
      setValidation(message);
      return;
    }

    const newPage = activePage + 1;
    navigate(newPage, setActivePage);
  };

  // const noneAreDuplicates = (e) => {
  //   e.preventDefault();

  //   // mark none as duplicates
  // };

  const goBack = (e) => {
    e.preventDefault();
    const newPage = activePage - 1;
    navigate(newPage, setActivePage);
  };

  const MiddleButton = () => {
    if (activePage === SELECT_GOALS_TO_MERGE) {
      return null;
      /**
       * commenting this (and the method above) out for now
       * it will not do anything until we have scoring in the database
       */
      // return (
      //   <Button outline onClick={noneAreDuplicates} type="button">
      //     None are duplicates
      //   </Button>
      // );
    }

    return (
      <Button outline onClick={goBack} type="button">
        Back
      </Button>
    );
  };

  const FirstButton = () => {
    if (activePage === REVIEW_AND_MERGE) {
      return (
        <ModalToggleButton modalRef={modalRef}>Merge goals</ModalToggleButton>
      );
    }

    return (
      <Button onClick={onContinue} type="button">
        Continue
      </Button>
    );
  };

  const backPath = `/recipient-tta-records/${recipientId}/region/${regionId}/rttapa`;

  const helpLink = (
    <button
      type="button"
      className="usa-button usa-button--unstyled"
      ref={drawerTriggerRef}
    >
      What happens when goals are merged?
    </button>
  );

  const onSubmit = async (data) => {
    try {
      setIsAppLoading(true);

      const finalSelectedGoalIds = data.selectedGoalIds.map((ids) => ids.split(',')).flat().map((id) => parseInt(id, DECIMAL_BASE));
      const mergedGoals = await mergeGoals(
        finalSelectedGoalIds,
        data.finalGoalId,
        recipientId,
        regionId,
      );
      const goalIds = mergedGoals.map((g) => g.id);
      setIsAppLoading(false);
      history.push(`${backPath}`, { mergedGoals: goalIds });
    } catch (e) {
      setValidation('Unable to merge goals');
      setIsAppLoading(false);
      modalRef.current.toggleModal(false);
    }
  };

  return (
    <div className="padding-top-5 position-relative">
      <Link
        className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block"
        to={backPath}
      >
        Back to
        {' '}
        {recipientNameWithRegion}
      </Link>
      <SocketAlert store={messageStore} messageSubject="on this goal merge" />
      <h1 className="ttahub-recipient-record--heading merge-goals page-heading margin-top-0 margin-bottom-3">
        These goals might be duplicates
      </h1>
      <p className="usa-prose">
        {/*  You can choose to merge 2 or more goals, or indicate that none are duplicates. */}
        You can choose to merge 2 or more goals.
      </p>
      <Container className="ttahub-merge-goals-container">
        <StepIndicator helpLink={helpLink}>
          {steps.map((step) => (
            <StepIndicatorStep
              key={`step-${step.position}`}
              label={step.label}
              status={stepIndicatorStatus(step.position, activePage)}
            />
          ))}
        </StepIndicator>
        <GoalMergeGuidanceDrawer drawerTriggerRef={drawerTriggerRef} />
        { activePage === SELECT_GOALS_TO_MERGE ? (
          <div className="padding-3">
            <Checkbox
              onChange={(e) => selectAll(e.target.checked)}
              id="select-all"
              name="select-all"
              label="Select all"
            />
          </div>
        ) : null }
        {(activePage === SELECT_GOALS_TO_KEEP && selectedGoalsIncludeCurated) && (
        <Alert type="info" className="margin-bottom-2">
          If a goal uses text associated with an OHS initiative, it will automatically
          be selected as the goal to keep, and other goals can&apos;t be selected.
        </Alert>
        )}
        <form onSubmit={hookForm.handleSubmit((data) => onSubmit(data))}>
          <Modal
            modalRef={modalRef}
            heading="Permanently merge goals?"
          >
            <p>This action can&apos;t be undone.</p>

            <Button
              type="submit"
              className="margin-right-1"
              onClick={(e) => hookForm.handleSubmit((data) => onSubmit(data))(e)}
            >
              Yes, merge goals
            </Button>
            <ModalToggleButton className="usa-button--subtle" closer modalRef={modalRef} data-focus="true">No, go back</ModalToggleButton>
          </Modal>
          <fieldset className="margin-right-2 padding-0 border-0" hidden={activePage !== SELECT_GOALS_TO_MERGE}>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                regionId={regionId}
                isRadio={false}
                register={register}
              />
            ))}
          </fieldset>
          <fieldset className="margin-right-2 padding-0 border-0" hidden={activePage !== SELECT_GOALS_TO_KEEP}>
            {selectedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                regionId={regionId}
                isRadio
                register={register}
                selectedGoalsIncludeCurated={selectedGoalsIncludeCurated}
              />
            ))}
          </fieldset>
          <div hidden={activePage !== REVIEW_AND_MERGE}>
            <FinalGoalCard
              selectedGoalIds={selectedGoalIds}
              goals={goals}
              finalGoalId={finalGoalId}
              regionId={regionId}
              register={register}
            />
          </div>
          {validation ? (
            <Alert type="error" className="margin-top-0 margin-bottom-2">
              {validation}
            </Alert>
          ) : null }
          <div>
            <FirstButton />
            <MiddleButton />
            <Link to={backPath} className="usa-button usa-button--outline">
              Cancel
            </Link>
          </div>
        </form>
      </Container>
    </div>
  );
}

MergeGoals.propTypes = {
  location: ReactRouterPropTypes.location.isRequired,
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  recipientNameWithRegion: PropTypes.string.isRequired,
  canMergeGoals: PropTypes.bool.isRequired,
};
