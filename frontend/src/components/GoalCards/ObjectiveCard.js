import React, { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import ObjectiveStatusDropdown from './components/ObjectiveStatusDropdown';
import { updateObjectiveStatus } from '../../fetchers/objective';
import colors from '../../colors';
import './ObjectiveCard.css';

function ObjectiveCard({
  objective,
  objectivesExpanded,
  goalStatus,
  regionId,
  dispatchStatusChange,
}) {
  const {
    title,
    endDate,
    reasons,
    topics,
    status,
    grantNumbers,
    activityReports,
    supportType,
    ids,
  } = objective;

  const [localStatus, setLocalStatus] = useState(status || 'Not Started');
  const [statusChangeError, setStatusChangeError] = useState();

  // using deep compare as we have an array in the dependency list
  useDeepCompareEffect(() => {
    dispatchStatusChange(objective.ids, localStatus);
  }, [dispatchStatusChange, localStatus, objective.ids]);

  const determineReasonMonitorStatus = (reason) => {
    if (reasonsToMonitor.includes(reason)) {
      return (
        <>
          <FontAwesomeIcon className="margin-left-1" size="1x" color={colors.error} icon={faFlag} />
        </>
      );
    }
    return null;
  };

  const displayReasonsList = (sortedReasons) => (
    <ul className="usa-list usa-list--unstyled">
      {
        sortedReasons.map((r) => (
          <li key={`reason_${r}`}>
            {r}
            {determineReasonMonitorStatus(r)}
          </li>
        ))
      }
    </ul>
  );

  const onUpdateObjectiveStatus = async (newStatus) => {
    try {
      setStatusChangeError(false);
      await updateObjectiveStatus(ids, regionId, newStatus);
      setLocalStatus(newStatus);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      // show an error in the UI
      setStatusChangeError(true);
    }
  };

  return (
    <ul className="ttahub-goal-card__objective-list usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg" hidden={!objectivesExpanded}>
      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Objective </span>
        <div>{title}</div>
      </li>
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
      <li className="display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 minw-15">Grant numbers </span>
        {grantNumbers.join(', ')}
      </li>
      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">End date </span>
        {endDate}
      </li>

      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Topics</span>
        {topics.join(', ')}
      </li>

      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Reasons</span>
        {reasons && displayReasonsList(reasons)}
      </li>

      <li className="desktop:display-flex padding-bottom-05 flex-align-start">
        <span className="margin-right-3 desktop:text-normal text-bold">Objective status </span>
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
          objectiveId={objective.id}
          regionId={regionId}
          className="line-height-sans-5"
          onUpdateObjectiveStatus={onUpdateObjectiveStatus}

        />
      </li>
    </ul>
  );
}

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
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
  goalStatus: PropTypes.string,
  regionId: PropTypes.number.isRequired,
  dispatchStatusChange: PropTypes.func,
};

ObjectiveCard.defaultProps = {
  dispatchStatusChange: () => {},
  goalStatus: null,
};

export default ObjectiveCard;
