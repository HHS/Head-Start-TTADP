import React, { useState, useRef } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { uniqueId } from 'lodash';
// import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import ObjectiveStatusDropdown from './components/ObjectiveStatusDropdown';
import { updateObjectiveStatus } from '../../fetchers/objective';
import ObjectiveSuspendModal from '../ObjectiveSuspendModal';
// import colors from '../../colors';
import './ObjectiveCard.css';

function ObjectiveCard({
  objective,
  objectivesExpanded,
  goalStatus,
  regionId,
  dispatchStatusChange,
  forceReadOnly,
  isMonitoringGoal,
}) {
  const {
    title,
    endDate,
    reasons = [],
    topics = [],
    status,
    // grantNumbers,
    activityReports,
    supportType,
    ids,
    citations,
  } = objective;
  const modalRef = useRef(null);
  const [localStatus, setLocalStatus] = useState(status || 'Not Started');
  const [localCloseSuspendReason, setLocalCloseSuspendReason] = useState('');
  const [localCloseSuspendContext, setLocalCloseSuspendContext] = useState('');
  const [suspendReasonError, setSuspendReasonError] = useState();
  const [statusChangeError, setStatusChangeError] = useState();

  // using deep compare as we have an array in the dependency list
  useDeepCompareEffect(() => {
    dispatchStatusChange(objective.ids, localStatus);
  }, [dispatchStatusChange, localStatus, objective.ids]);

  // const determineReasonMonitorStatus = (reason) => {
  //   if (reasonsToMonitor.includes(reason)) {
  //     return (
  //       <>
  // eslint-disable-next-line max-len
  //         <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.error} icon={faFlag} />
  //       </>
  //     );
  //   }
  //   return null;
  // };

  // const displayReasonsList = (sortedReasons) => (
  //   <ul className="usa-list usa-list--unstyled">
  //     {
  //       sortedReasons.map((r) => (
  //         <li key={`reason_${r}`}>
  //           {r}
  //           {determineReasonMonitorStatus(r)}
  //         </li>
  //       ))
  //     }
  //   </ul>
  // );

  const onChangeStatus = async (
    newStatus,
  ) => {
    try {
      setStatusChangeError(false);
      await updateObjectiveStatus(
        ids,
        regionId,
        newStatus,
        localCloseSuspendReason,
        localCloseSuspendContext,
      );
      setLocalStatus(newStatus);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      // show an error in the UI
      setStatusChangeError(true);
    }
  };

  const onUpdateObjectiveStatus = async (newStatus) => {
    if (newStatus === 'Suspended') {
      modalRef.current.toggleModal();
      return;
    }

    await onChangeStatus(newStatus);
  };

  const modalIdentifier = uniqueId('objective-suspend-identifier-');

  return (
    <ul data-testid="objectiveList" className="ttahub-goal-card__objective-list usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg" hidden={!objectivesExpanded}>
      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Objective </span>
        <div>{title}</div>
      </li>
      {
        isMonitoringGoal && (
          <li className="desktop:display-flex padding-bottom-05 flex-align-start">
            <span className="margin-right-3 desktop:text-normal text-bold">Citations addressed </span>
            <div>{citations.join(', ')}</div>
          </li>
        )
      }
      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Activity reports </span>
        <ul className="usa-list usa-list--unstyled">
          {activityReports.map((report) => {
            const viewOrEditLink = `/activity-reports/view/${report.id}`;
            const linkToAr = report.legacyId ? `/activity-reports/legacy/${report.legacyId}` : viewOrEditLink;
            return (
              <li key={`AR-${report.id}`}>
                <Link
                  to={linkToAr}
                >
                  {report.displayId}
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
      {supportType && (
        <li className="display-flex padding-bottom-05 flex-align-start">
          <span className="margin-right-3 minw-15">Support type </span>
          {supportType}
        </li>
      )}
      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">End date </span>
        {endDate}
      </li>

      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Topics</span>
        {topics.join(', ')}
      </li>

      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Objective status </span>
        <div>
          {(statusChangeError && (
            <Alert type="error" className="margin-top-1">
              There was an error updating the status of this objective.
              {' '}
              For more assistance, please contact support.
            </Alert>
          ))}
          <ObjectiveStatusDropdown
            currentStatus={localStatus}
            goalStatus={goalStatus}
            objectiveTitle={objective.title}
            regionId={regionId}
            className="line-height-sans-5"
            onUpdateObjectiveStatus={onUpdateObjectiveStatus}
            forceReadOnly={forceReadOnly}
          />
          {!(forceReadOnly) && (
            <ObjectiveSuspendModal
              objectiveId={modalIdentifier}
              modalRef={modalRef}
              objectiveSuspendReason={localCloseSuspendReason}
              onChangeSuspendReason={(e) => setLocalCloseSuspendReason(e.target.value)}
              objectiveSuspendInputName={`suspend-objective-${modalIdentifier}-reason`}
              objectiveSuspendContextInputName={`suspend-objective-${modalIdentifier}-context`}
              objectiveSuspendContext={localCloseSuspendContext}
              onChangeSuspendContext={(e) => setLocalCloseSuspendContext(e.target.value)}
              onChangeStatus={onChangeStatus}
              setError={setSuspendReasonError}
              error={suspendReasonError}
            />
          )}
        </div>
      </li>
    </ul>
  );
}

export const objectivePropTypes = PropTypes.shape({
  title: PropTypes.string.isRequired,
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string),
  status: PropTypes.string.isRequired,
  grantNumbers: PropTypes.arrayOf(PropTypes.string),
  activityReports: PropTypes.arrayOf(PropTypes.shape({
    legacyId: PropTypes.string,
    number: PropTypes.string,
    id: PropTypes.number,
    endDate: PropTypes.string,
  })),
  topics: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })),
  citations: PropTypes.arrayOf(PropTypes.string),
  supportType: PropTypes.string,
  ids: PropTypes.arrayOf(PropTypes.number).isRequired,
});

objectivePropTypes.defaultProps = {
  goalStatus: null,
  arLegacyId: null,
  endDate: null,
  reasons: [],
  grantNumbers: [],
  activityReports: [],
  supportType: '',
};
ObjectiveCard.propTypes = {
  objective: objectivePropTypes.isRequired,
  objectivesExpanded: PropTypes.bool.isRequired,
  isMonitoringGoal: PropTypes.bool,
  goalStatus: PropTypes.string,
  regionId: PropTypes.number.isRequired,
  dispatchStatusChange: PropTypes.func,
  forceReadOnly: PropTypes.bool,
};

ObjectiveCard.defaultProps = {
  dispatchStatusChange: () => {},
  goalStatus: null,
  forceReadOnly: false,
  isMonitoringGoal: false,
};

export default ObjectiveCard;
