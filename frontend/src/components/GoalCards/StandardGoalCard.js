import React, {
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { DECIMAL_BASE } from '@ttahub/common';
import { Checkbox, Alert } from '@trussworks/react-uswds';
import moment from 'moment';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { goalPropTypes } from './constants';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';
import { deleteGoal, updateGoalStatus } from '../../fetchers/goals';
import useObjectiveStatusMonitor from '../../hooks/useObjectiveStatusMonitor';
import isAdmin, { hasApproveActivityReportInRegion, canEditOrCreateGoals } from '../../permissions';
import SpecialistTags from '../../pages/RecipientRecord/pages/Monitoring/components/SpecialistTags';
import DataCard from '../DataCard';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import GoalStatusDropdown from './components/GoalStatusDropdown';
import ContextMenu from '../ContextMenu';
import FlagStatus from './FlagStatus';
import ExpanderButton from '../ExpanderButton';
import ObjectiveCard from './ObjectiveCard';
import GoalStatusChangeAlert from './components/GoalStatusChangeAlert';
import CloseSuspendReasonModal from '../CloseSuspendReasonModal';

export default function StandardGoalCard({
  goal,
  recipientId,
  regionId,
  handleGoalCheckboxSelect,
  isChecked,
  readonly,
  erroneouslySelected,
}) {
  const {
    id,
    ids = [id],
    status,
    name,
    objectives = [],
    onAR,
    grant = { number: 'N/A' },
    statusChanges = [],
    isReopened,
    standard,
    createdAt,
  } = goal;

  const lastStatusChange = statusChanges[statusChanges.length - 1]
    || { oldStatus: GOAL_STATUS.NOT_STARTED };
  const previousStatus = lastStatusChange.oldStatus;

  const isMonitoringGoal = standard === 'Monitoring';
  const isPreStandard = goal.prestandard === true;
  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const [localStatus, setLocalStatus] = useState(status);
  const [localObjectives, setLocalObjectives] = useState(objectives);
  const [targetStatusForModal, setTargetStatusForModal] = useState('');
  const [statusChangeError, setStatusChangeError] = useState(false);
  const closeSuspendModalRef = useRef();
  const [resetModalValues, setResetModalValues] = useState(false);

  const [invalidStatusChangeAttempted, setInvalidStatusChangeAttempted] = useState(false);
  const sortedObjectives = [...localObjectives];
  sortedObjectives.sort((a, b) => ((new Date(a.endDate) < new Date(b.endDate)) ? 1 : -1));
  const hasEditButtonPermissions = canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE));
  const {
    atLeastOneObjectiveIsNotCompleted,
    dispatchStatusChange,
  } = useObjectiveStatusMonitor(objectives);

  // Sync local status if goal prop changes externally
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  useEffect(() => {
    if (invalidStatusChangeAttempted === true && !atLeastOneObjectiveIsNotCompleted) {
      setInvalidStatusChangeAttempted(false);
    }
  }, [atLeastOneObjectiveIsNotCompleted, invalidStatusChangeAttempted]);

  const [deleteError, setDeleteError] = useState(false);

  const lastTTA = useMemo(() => {
    const latestDate = objectives.reduce((prev, curr) => (new Date(prev) > new Date(curr.endDate) ? prev : curr.endDate), '');
    return latestDate ? moment(latestDate).format(DATE_DISPLAY_FORMAT) : '';
  }, [objectives]);
  const history = useHistory();
  const goalNumber = goal.goalNumbers ? goal.goalNumbers.join(', ') : `G-${id}`;

  const editLink = `/recipient-tta-records/${recipientId}/region/${regionId}/standard-goals/${goal.goalTemplateId}/grant/${goal.grant.id}`;
  const reopenLink = `/recipient-tta-records/${recipientId}/region/${regionId}/standard-goals/${goal.goalTemplateId}/grant/${goal.grant.id}/restart`;
  const viewLink = `/recipient-tta-records/${recipientId}/region/${regionId}/goals/standard?goalId=${id}`;

  const changeGoalStatus = async (newStatus, reason = null, context = null) => {
    try {
      setStatusChangeError(false);
      // API expects: goalIds (array), newStatus, oldStatus, closeSuspendReason, closeSuspendContext
      await updateGoalStatus(ids, newStatus, localStatus, reason, context);
      setLocalStatus(newStatus);
      if (newStatus === GOAL_STATUS.SUSPENDED) {
        const statusesNeedUpdating = [
          GOAL_STATUS.NOT_STARTED,
          GOAL_STATUS.IN_PROGRESS,
        ];
        setLocalObjectives((prevObjectives) => prevObjectives.map((objective) => {
          if (statusesNeedUpdating.includes(objective.status)) {
            return {
              ...objective,
              status: GOAL_STATUS.SUSPENDED,
            };
          }

          return objective;
        }));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error updating goal status:', err);
      setStatusChangeError(true);
    }
  };

  const onUpdateGoalStatus = (newStatus) => {
    // prevent closing if objectives aren't complete/suspended
    if (newStatus === 'Closed' && atLeastOneObjectiveIsNotCompleted) {
      setInvalidStatusChangeAttempted(true);
      return;
    }

    setInvalidStatusChangeAttempted(false);

    // check if the new status requires a reason modal
    if ([GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED].includes(newStatus)) {
      setTargetStatusForModal(newStatus);
      setResetModalValues(!resetModalValues);
      closeSuspendModalRef.current.toggleModal(true);
    } else {
      changeGoalStatus(newStatus);
    }
  };

  const handleModalSubmit = (
    goalIdsFromModal,
    statusFromModal,
    oldStatusFromModal,
    reason,
    context,
  ) => {
    changeGoalStatus(statusFromModal, reason, context);
    closeSuspendModalRef.current.toggleModal(false);
  };

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

  const closeOrOpenObjectives = () => {
    setObjectivesExpanded(!objectivesExpanded);
  };

  const contextMenuLabel = `Actions for goal ${id}`;
  const menuItems = [];
  // For monitoring goals, only admins can delete
  const hasAdminPermissions = isAdmin(user);
  const editableStatuses = [GOAL_STATUS.DRAFT, GOAL_STATUS.NOT_STARTED, GOAL_STATUS.IN_PROGRESS];
  if (editableStatuses.includes(localStatus) && !isPreStandard && hasEditButtonPermissions) {
    menuItems.push({
      label: 'Edit',
      onClick: () => {
        history.push(editLink);
      },
    });
  } else if (localStatus === GOAL_STATUS.CLOSED
    && !isPreStandard && ((hasEditButtonPermissions && !isMonitoringGoal) || hasAdminPermissions)) {
    // For monitoring goals, only admins can reopen
    menuItems.push({
      label: 'Reopen',
      onClick: () => {
        history.push(reopenLink);
      },
    });
  }

  menuItems.push({
    label: 'View details',
    onClick: () => {
      history.push(viewLink);
    },
  });

  const canDeleteQualifiedGoals = (() => {
    if (isAdmin(user)) {
      return true;
    }

    return (
      !isMonitoringGoal
      && hasApproveActivityReportInRegion(user, parseInt(regionId, DECIMAL_BASE)));
  })();

  if (canDeleteQualifiedGoals && !onAR && !isPreStandard
    && [GOAL_STATUS.DRAFT, GOAL_STATUS.NOT_STARTED].includes(localStatus)) {
    menuItems.push({
      label: 'Delete',
      onClick: async () => {
        try {
          setDeleteError(false);
          setIsAppLoading(true);
          await deleteGoal(ids, regionId);
          history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/rttapa`, { message: 'Goal deleted successfully' });
        } catch (e) {
          setDeleteError(true);
        } finally {
          setIsAppLoading(false);
        }
      },
    });
  }

  // Determine the status change label based on current status
  const getStatusChangeLabel = () => {
    if (statusChanges.length === 1 && isReopened) {
      return 'Reopened on';
    }

    switch (localStatus) {
      case GOAL_STATUS.NOT_STARTED:
        return 'Added on';
      case GOAL_STATUS.IN_PROGRESS:
        return 'Started on';
      case GOAL_STATUS.SUSPENDED:
        return 'Suspended on';
      case GOAL_STATUS.CLOSED:
        return 'Closed on';
      default:
        return 'Added on'; // Default or Draft status
    }
  };

  // Determine who changed the status
  const getStatusChangeBy = () => {
    if (statusChanges.length === 1 && isReopened) {
      return 'Reopened by';
    }

    switch (localStatus) {
      case GOAL_STATUS.NOT_STARTED:
        return 'Added by';
      case GOAL_STATUS.IN_PROGRESS:
        return 'Started by';
      case GOAL_STATUS.SUSPENDED:
        return 'Suspended by';
      case GOAL_STATUS.CLOSED:
        return 'Closed by';
      default:
        return 'Added by'; // Default or Draft status
    }
  };

  const renderEnteredBy = () => {
    if (isMonitoringGoal && (!lastStatusChange || !lastStatusChange.user)) {
      return (
        <SpecialistTags
          specialists={[{
            name: 'System-generated',
            roles: ['OHS'],
          }]}
        />
      );
    }

    if (lastStatusChange && lastStatusChange.user) {
      return (
        <SpecialistTags
          specialists={[{
            name: lastStatusChange.user.name,
            roles: lastStatusChange.user.roles.map((r) => r.name),
          }]}
        />
      );
    }

    return null;
  };

  const getResponses = () => {
    const responses = goal.responses && goal.responses.length ? goal.responses[0].response : [];
    return responses.map((r) => r).join(', ');
  };

  return (
    <DataCard testId="goalCard" className="ttahub-goal-card position-relative" errorBorder={erroneouslySelected || deleteError || statusChangeError}>
      <div className="display-flex">
        <div className="flex-0" style={{ visibility: readonly ? 'hidden' : 'visible' }}>
          <Checkbox
            disabled={readonly}
            id={`goal-select-${id}`}
            label=""
            value={id}
            checked={isChecked}
            onChange={handleGoalCheckboxSelect}
            aria-label={`Select goal ${name}`}
            className="margin-right-1"
            data-testid="selectGoalTestId"
          />
        </div>
        <div className="grid-container padding-0 flex-1">
          {/* Status and menu row */}
          <div className="grid-row margin-bottom-2">
            <div className="grid-col-12">
              <div className="display-flex flex-justify">
                <GoalStatusDropdown
                  showReadOnlyStatus={readonly}
                  goalId={id}
                  status={localStatus}
                  onUpdateGoalStatus={onUpdateGoalStatus}
                  previousStatus={previousStatus}
                  regionId={regionId}
                />
                {!readonly && (
                  <ContextMenu
                    label={contextMenuLabel}
                    menuItems={menuItems}
                    menuWidthOffset={100}
                  />
                )}
              </div>
            </div>
          </div>
          {/* Alert for API errors */}
          {statusChangeError && (
            <Alert type="error" slim className="margin-top-1 margin-left-5">
              There was an error updating the goal status. Please try again.
            </Alert>
          )}
          {/* Alert for invalid status change attempt */}
          <GoalStatusChangeAlert
            internalLeftMargin="3rem"
            invalidStatusChangeAttempted={invalidStatusChangeAttempted}
          />
          <div className="grid-row mobile-tablet-space-y-2">
            {/* Left section - Goal number and name */}
            <div className="desktop:grid-col-4 tablet-lg:grid-col-12 tablet:grid-col-12 padding-right-3">
              <p className="usa-prose text-bold margin-y-0">
                Goal
                {' '}
                {goalNumber}
              </p>
              <p className="usa-prose text-wrap margin-y-0">
                {name}
                {' '}
                {isMonitoringGoal && (
                  <FlagStatus
                    reasons={['Monitoring Goal']}
                    goalNumbers={goalNumber}
                  />
                )}
              </p>
              {goal.responses && goal.responses.length ? (
                <div className="grid-row margin-top-1">
                  <p className="usa-prose text-bold margin-bottom-0 margin-top-0 margin-right-1">
                    Root cause:
                  </p>
                  <p className="usa-prose margin-bottom-0 margin-top-0">
                    {getResponses()}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Right section - Details */}
            <div className="desktop:grid-col-8 tablet:grid-col-12">
              <div className="grid-container padding-0">
                <div className="grid-row space-y-2 mobile-lg:space-y-0">
                  <div className="mobile:grid-col-12 tablet-lg:grid-col-3 desktop:grid-col-3">
                    <p className="usa-prose text-bold margin-y-0">Grant number</p>
                    <p className="usa-prose margin-y-0 text-wrap">{grant.number || 'N/A'}</p>
                  </div>

                  <div className="mobile:grid-col-12 tablet-lg:grid-col-3 desktop:grid-col-3">
                    <p className="usa-prose text-bold margin-y-0">{getStatusChangeLabel()}</p>
                    <p className="usa-prose margin-y-0">
                      {moment(lastStatusChange.performedAt || createdAt, 'YYYY-MM-DD').format(DATE_DISPLAY_FORMAT)}
                    </p>
                  </div>

                  <div className="mobile:grid-col-12 tablet-lg:grid-col-3 desktop:grid-col-3">
                    <p className="usa-prose text-bold margin-y-0">Last TTA</p>
                    <p className="usa-prose margin-y-0">{lastTTA}</p>
                  </div>

                  <div className="mobile:grid-col-12 tablet-lg:grid-col-3 desktop:grid-col-3">
                    <p className="usa-prose text-bold margin-y-0">{getStatusChangeBy()}</p>
                    <div className="usa-prose margin-y-0">
                      {renderEnteredBy()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="margin-left-5 margin-top-2">
        <ExpanderButton
          type="objective"
          ariaLabel={`objectives for goal ${goalNumber}`}
          closeOrOpen={closeOrOpenObjectives}
          count={localObjectives.length}
          expanded={objectivesExpanded}
        />
      </div>
      {sortedObjectives.map((obj) => (
        <ObjectiveSwitch
          key={obj.id}
          objective={obj}
          objectivesExpanded={objectivesExpanded}
          goalStatus={localStatus}
          regionId={parseInt(regionId, DECIMAL_BASE)}
          dispatchStatusChange={dispatchStatusChange}
          isMonitoringGoal={isMonitoringGoal}
        />
      ))}
      {/* Modal for Close/Suspend Reason */}
      <CloseSuspendReasonModal
        modalRef={closeSuspendModalRef}
        id={`close-suspend-reason-modal-${id}`}
        goalIds={ids}
        newStatus={targetStatusForModal}
        oldGoalStatus={localStatus}
        onSubmit={handleModalSubmit}
        resetValues={resetModalValues}
      />
    </DataCard>
  );
}

StandardGoalCard.propTypes = {
  goal: goalPropTypes.isRequired,
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  handleGoalCheckboxSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
  readonly: PropTypes.bool,
  erroneouslySelected: PropTypes.bool,
};

StandardGoalCard.defaultProps = {
  readonly: false,
  erroneouslySelected: false,
};

export const ObjectiveSwitch = ({
  objective,
  objectivesExpanded,
  regionId,
  goalStatus,
  dispatchStatusChange,
  isMonitoringGoal,
}) => (
  <ObjectiveCard
    objective={objective}
    objectivesExpanded={objectivesExpanded}
    goalStatus={goalStatus}
    regionId={regionId}
    dispatchStatusChange={dispatchStatusChange}
    isMonitoringGoal={isMonitoringGoal}
  />
);

ObjectiveSwitch.propTypes = {
  objective: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
  }).isRequired,
  objectivesExpanded: PropTypes.bool.isRequired,
  regionId: PropTypes.number.isRequired,
  goalStatus: PropTypes.string.isRequired,
  dispatchStatusChange: PropTypes.func.isRequired,
  isMonitoringGoal: PropTypes.bool.isRequired,
};
