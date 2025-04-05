import React, {
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { DECIMAL_BASE } from '@ttahub/common';
import { Checkbox } from '@trussworks/react-uswds';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { goalPropTypes } from './constants';
import UserContext from '../../UserContext';
import AppLoadingContext from '../../AppLoadingContext';
import { deleteGoal } from '../../fetchers/goals';
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

export default function StandardGoalCard({
  goal,
  recipientId,
  regionId,
  showCloseSuspendGoalModal,
  showReopenGoalModal,
  performGoalStatusUpdate,
  handleGoalCheckboxSelect,
  isChecked,
  // eslint-disable-next-line max-len
  readonly, // previously we had 'hideCheckbox' and 'showReadOnlyStatus' and 'hideGoalOptions', which all mean "this is readonly"
  erroneouslySelected,
}) {
  const {
    id,
    ids = [id],
    status,
    createdAt,
    name,
    objectives = [],
    goalCollaborators = [],
    onAR,
    grant = { number: 'N/A' },
    previousStatus,
  } = goal;

  const isMonitoringGoal = goal.createdVia === 'monitoring';
  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const [invalidStatusChangeAttempted, setInvalidStatusChangeAttempted] = useState();
  const sortedObjectives = [...objectives];
  sortedObjectives.sort((a, b) => ((new Date(a.endDate) < new Date(b.endDate)) ? 1 : -1));
  const hasEditButtonPermissions = canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE));
  const {
    atLeastOneObjectiveIsNotCompletedOrSuspended,
    dispatchStatusChange,
  } = useObjectiveStatusMonitor(objectives);

  useEffect(() => {
    if (invalidStatusChangeAttempted === true && !atLeastOneObjectiveIsNotCompletedOrSuspended) {
      setInvalidStatusChangeAttempted(false);
    }
  }, [atLeastOneObjectiveIsNotCompletedOrSuspended, invalidStatusChangeAttempted]);

  const [deleteError, setDeleteError] = useState(false);

  const lastTTA = useMemo(() => {
    const latestDate = objectives.reduce((prev, curr) => (new Date(prev) > new Date(curr.endDate) ? prev : curr.endDate), '');
    return latestDate ? moment(latestDate).format(DATE_DISPLAY_FORMAT) : '';
  }, [objectives]);
  const history = useHistory();
  const goalNumber = goal.goalNumbers ? goal.goalNumbers.join(', ') : `G-${id}`;

  const editLink = `/recipient-tta-records/${recipientId}/region/${regionId}/standard-goals/${goal.goalTemplateId}/grant/${goal.grant.id}`;
  const viewLink = `/recipient-tta-records/${recipientId}/region/${regionId}/goals/standard?goalId=${id}`;

  const onUpdateGoalStatus = (newStatus) => {
    if (newStatus === 'Closed' && atLeastOneObjectiveIsNotCompletedOrSuspended) {
      setInvalidStatusChangeAttempted(true);
      return;
    }

    setInvalidStatusChangeAttempted(false);

    if (newStatus === 'Completed' || newStatus === 'Closed' || newStatus === 'Ceased/Suspended' || newStatus === 'Suspended') {
      // Must provide reason for Close or Suspend.
      showCloseSuspendGoalModal(newStatus, [id], status);
    } else {
      performGoalStatusUpdate(ids, newStatus, status);
    }
  };

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

  const closeOrOpenObjectives = () => {
    setObjectivesExpanded(!objectivesExpanded);
  };

  const contextMenuLabel = `Actions for goal ${id}`;
  const menuItems = [];

  if (status !== 'Closed' && hasEditButtonPermissions) {
    menuItems.push({
      label: 'Edit',
      onClick: () => {
        history.push(editLink);
      },
    });
  } else if (status === 'Closed' && hasEditButtonPermissions && showReopenGoalModal) {
    menuItems.push({
      label: 'Reopen',
      onClick: () => {
        showReopenGoalModal(id);
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

    return hasApproveActivityReportInRegion(user, parseInt(regionId, DECIMAL_BASE));
  })();

  if (canDeleteQualifiedGoals && !onAR && ['Draft', 'Not Started'].includes(status)) {
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
    switch (status) {
      case 'Not Started':
        return 'Added on';
      case 'In Progress':
        return 'Started on';
      case 'Suspended':
        return 'Suspended on';
      case 'Closed':
        return 'Closed on';
      default:
        return 'Added on';
    }
  };

  // Determine who changed the status
  const getStatusChangeBy = () => {
    switch (status) {
      case 'Not Started':
        return 'Added by';
      case 'In Progress':
        return 'Started by';
      case 'Suspended':
        return 'Suspended by';
      case 'Closed':
        return 'Closed by';
      default:
        return 'Added by';
    }
  };

  const renderEnteredBy = () => {
    if (isMonitoringGoal) {
      return (
        <SpecialistTags
          specialists={[{
            name: 'System-generated',
            roles: ['OHS'],
          }]}
        />
      );
    }
    return (
      <SpecialistTags
        specialists={goalCollaborators
          .filter((c) => ((c.user && c.user.name) || c.goalCreatorName))
          .map((c) => ({
            name: (c.user && c.user.name) || c.goalCreatorName,
            roles: [(c.user && c.user.userRoles) || c.goalCreatorRoles].flat(),
          }))}
      />
    );
  };

  return (
    <DataCard testId="goalCard" className="ttahub-goal-card" errorBorder={erroneouslySelected || deleteError}>
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
                  status={status}
                  onUpdateGoalStatus={onUpdateGoalStatus}
                  previousStatus={previousStatus || 'Not Started'}
                  regionId={regionId}
                />
                { !readonly && (
                  <ContextMenu
                    label={contextMenuLabel}
                    menuItems={menuItems}
                    menuWidthOffset={100}
                  />
                )}
              </div>
            </div>
          </div>
          <GoalStatusChangeAlert
            internalLeftMargin={30}
            editLink={editLink}
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
                    <p className="usa-prose margin-y-0">{moment(createdAt, 'YYYY-MM-DD').format(DATE_DISPLAY_FORMAT)}</p>
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
          count={objectives.length}
          expanded={objectivesExpanded}
        />
      </div>
      {sortedObjectives.map((obj) => (
        <ObjectiveSwitch
          key={`objective_${uuidv4()}`}
          objective={obj}
          objectivesExpanded={objectivesExpanded}
          goalStatus={status}
          regionId={parseInt(regionId, DECIMAL_BASE)}
          dispatchStatusChange={dispatchStatusChange}
          isMonitoringGoal={isMonitoringGoal}
        />
      ))}
    </DataCard>
  );
}

StandardGoalCard.propTypes = {
  goal: goalPropTypes.isRequired,
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  showCloseSuspendGoalModal: PropTypes.func.isRequired,
  showReopenGoalModal: PropTypes.func,
  performGoalStatusUpdate: PropTypes.func.isRequired,
  handleGoalCheckboxSelect: PropTypes.func.isRequired,
  isChecked: PropTypes.bool.isRequired,
  readonly: PropTypes.bool,
  erroneouslySelected: PropTypes.bool,
};

StandardGoalCard.defaultProps = {
  readonly: false,
  erroneouslySelected: false,
  showReopenGoalModal: null,
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
