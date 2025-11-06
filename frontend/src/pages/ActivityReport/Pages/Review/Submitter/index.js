import React, { useState, useEffect } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common';
import Container from '../../../../../components/Container';
import DraftReview from './Draft';
import NeedsAction from './NeedsAction';
import Approved from '../Approved';

const Submitter = ({
  availableApprovers,
  onFormSubmit,
  formData,
  children,
  error,
  onSaveForm,
  pages,
  lastSaveTime,
  reviewItems,
}) => {
  const {
    additionalNotes,
    id,
    displayId,
    calculatedStatus,
    approvers,
    creatorRole,
    goalsAndObjectives,
    activityRecipients,
  } = formData;
  const draft = calculatedStatus === REPORT_STATUSES.DRAFT;
  const submitted = calculatedStatus === REPORT_STATUSES.SUBMITTED;
  const needsAction = calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  const approved = calculatedStatus === REPORT_STATUSES.APPROVED;
  const [approverStatusList, updateApproverStatusList] = useState([]);

  useEffect(() => {
    const updatedApprovers = approvers ? approvers.filter((a) => a.user) : [];
    if (updatedApprovers) {
      updateApproverStatusList(updatedApprovers);
    }
  }, [approvers, formData]);

  const getNeedsActionApprovingMangers = () => {
    const needActionApprovers = approvers.filter((a) => a.status === REPORT_STATUSES.NEEDS_ACTION);
    if (needActionApprovers && needActionApprovers.length > 0) {
      return needActionApprovers.map((a) => a.user.fullName).join(', ');
    }
    return '';
  };

  const renderTopAlert = () => (
    <>
      {needsAction && (
        <Alert type="error" noIcon slim className="margin-bottom-1 no-print">
          <span className="text-bold">
            The following approving manager(s) have requested changes to this activity report:
            {' '}
            {getNeedsActionApprovingMangers()}
          </span>
          <br />
          Please review the manager notes below and re-submit for approval.
        </Alert>
      )}
      {approved && (
        <Alert type="info" noIcon slim className="margin-bottom-1 no-print">
          This report has been approved and is no longer editable
        </Alert>
      )}
    </>
  );

  const filtered = pages.filter((p) => !(p.state === 'Complete' || p.review));
  const incompletePages = filtered.map((f) => f.label);

  /*
  grantsMissingMonitoring:
  * This checks that if we only have a single monitoring goal selected,
  * that all selected recipient/grants are associated with that goal.
  * If not they either need to remove the recipient or add a standard goal.
  */
  const grantsMissingMonitoring = () => {
    // 1. Determine if a monitoring goal is selected.
    const hasMonitoringGoalSelected = (goalsAndObjectives || []).find((goal) => (goal.standard && goal.standard === 'Monitoring'));
    // 2. If we only have a monitoring goal selected (no other goals).
    if ((!goalsAndObjectives || goalsAndObjectives.length === 1) && hasMonitoringGoalSelected) {
      // 3. Determine if any selected recipients are not applicable the the monitoring goal.
      const missingGrants = activityRecipients.filter(
        (recipient) => !hasMonitoringGoalSelected.grantIds.includes(recipient.activityRecipientId),
      ).map((recipient) => recipient.activityRecipientId);

      // 4. Get the names of the recipents/grants that are not applicable to this monitoring goal.
      const grantNames = activityRecipients.filter(
        (recipient) => missingGrants.includes(recipient.activityRecipientId),
      ).map(
        (recipient) => recipient.name,
      );
      return grantNames;
    }
    return [];
  };

  /*
  grantsMissingCitations:
    This returns grants that are missing citations,
    that should have them on the monitoring goal.
    This happens regardless of how many additional goals are selected.
  */
  const grantsMissingCitations = () => {
    // 1. Determine if a monitoring goal is selected.
    const hasMonitoringGoalSelected = (goalsAndObjectives || []).find((goal) => (goal.standard && goal.standard === 'Monitoring'));
    if (hasMonitoringGoalSelected) {
      // 2. Get all the grant ids off the SELECTED citations.
      // The complexity in the reduce is because we need to parse the monitoringReferences (JSON).
      const selectedCitationGrantIds = hasMonitoringGoalSelected.objectives.reduce(
        (acc, objective) => {
          const monitoringReferencesFlat = (objective.citations || []).map(
            (citation) => citation.monitoringReferences,
          ).flat();

          const monitoringReferenceGrantIds = monitoringReferencesFlat.map(
            (reference) => reference.grantId,
          );

          // Add the grant ids to the objective id in the accumulator.
          acc[objective.id] = monitoringReferenceGrantIds;
          return acc;
        }, {},
      );

      // 3. Get the grants ids that are associated with this monitoring goal.
      // We only save for the grants that require monitoring.
      // The grantIds should only be for the applicable grants on this report.
      const grantsThatRequireMonitoring = hasMonitoringGoalSelected.grantIds;

      // 4. Check each objective and find any missing citations.
      const grantsFoundMissingCitations = grantsThatRequireMonitoring.reduce(
        (acc, grantId) => {
          const objectiveIds = Object.keys(selectedCitationGrantIds);
          const missingCitations = objectiveIds.filter(
            (objectiveId) => !selectedCitationGrantIds[objectiveId].includes(grantId),
          );
          if (missingCitations.length > 0) {
            acc.push(grantId);
          }
          return acc;
        }, [],
      );
      const distinctGrantIdsMissing = [...new Set(grantsFoundMissingCitations)];

      // 5. From activityRecipients get the name of the grants that match the activityRecipientId.
      const grantNames = activityRecipients.filter(
        (recipient) => distinctGrantIdsMissing.includes(recipient.activityRecipientId),
      ).map(
        (recipient) => recipient.name,
      );
      // 6. Return the names of the missing recipients/grants.
      return grantNames;
    }
    return [];
  };

  return (
    <>
      {renderTopAlert()}
      {children}

      <Container skipTopPadding className="margin-bottom-0 padding-top-2 padding-bottom-5" skipBottomPadding={!submitted && !draft} paddingY={0}>
        {error && (
        <Alert noIcon className="margin-y-4" type="error">
          <b>Error</b>
          <br />
          {error}
        </Alert>
        )}
        {draft
          && (
            <DraftReview
              onSaveForm={onSaveForm}
              incompletePages={incompletePages}
              availableApprovers={availableApprovers}
              onFormSubmit={onFormSubmit}
              reportId={id}
              displayId={displayId}
              approverStatusList={approverStatusList}
              lastSaveTime={lastSaveTime}
              creatorRole={creatorRole}
              grantsMissingMonitoring={grantsMissingMonitoring()}
              grantsMissingCitations={grantsMissingCitations()}
              reviewItems={reviewItems}
            />
          )}
        {needsAction
          && (
            <NeedsAction
              additionalNotes={additionalNotes}
              onSubmit={onFormSubmit}
              incompletePages={incompletePages}
              approverStatusList={approverStatusList}
              creatorRole={creatorRole}
              displayId={displayId}
              reportId={id}
              availableApprovers={availableApprovers}
              reviewItems={reviewItems}
              grantsMissingMonitoring={grantsMissingMonitoring()}
              grantsMissingCitations={grantsMissingCitations()}
            />
          )}
        {approved
          && (
            <Approved
              additionalNotes={additionalNotes}
              approverStatusList={approverStatusList}
              reviewItems={reviewItems}
            />
          )}
      </Container>
    </>
  );
};

Submitter.propTypes = {
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
  onSaveForm: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    creatorRole: PropTypes.string,
    id: PropTypes.number,
    displayId: PropTypes.string,
    approvers: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
      }),
    ),
    goalsAndObjectives: PropTypes.arrayOf(PropTypes.shape({
      standard: PropTypes.string,
      grantIds: PropTypes.arrayOf(PropTypes.number),
    })),
    activityRecipients: PropTypes.arrayOf(PropTypes.shape({
      activityRecipientId: PropTypes.number,
      name: PropTypes.string,
    })),
  }).isRequired,
  lastSaveTime: PropTypes.instanceOf(moment),
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.node,
  })).isRequired,
};

Submitter.defaultProps = {
  error: '',
  lastSaveTime: undefined,
};

export default Submitter;
