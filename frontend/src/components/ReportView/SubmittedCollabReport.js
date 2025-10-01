import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import Container from '../Container';
import {
  DATE_DISPLAY_FORMAT,
  STATES,
  COLLAB_REPORT_REASONS,
  COLLAB_REPORT_DATA,
} from '../../Constants';
import ReadOnlyContent from '../ReadOnlyContent';

export function formatNextSteps(nextSteps) {
  return nextSteps.map((step, index) => ({
    data: {
      [`Step ${index + 1}`]: step.collabStepDetail,
      'Anticipated completion': step.collabStepCompleteDate,
    },
    striped: false,
  }));
}

export default function SubmittedCollabReport({ report }) {
  const {
    name: activityName,
    startDate,
    endDate,
    duration,
    description,
    author,
    isStateActivity,
    collabReportSpecialists,
    approvers,
    displayId,
    createdAt,
    submittedAt,
    approvedAt,
    submissionStatus,
    calculatedStatus,
    participants,
    otherParticipants,
    statesInvolved,
    reportReasons,
    reportGoals,
    dataUsed,
    otherDataUsed,
    steps,
  } = report;

  // Format dates
  const formattedStartDate = moment(startDate).format(DATE_DISPLAY_FORMAT);
  const formattedEndDate = moment(endDate).format(DATE_DISPLAY_FORMAT);
  const formattedDuration = `${duration} hours`;
  const formattedCreatedAt = moment(createdAt).format(DATE_DISPLAY_FORMAT);
  const formattedSubmittedAt = moment(submittedAt).format(DATE_DISPLAY_FORMAT);
  const formattedApprovedAt = moment(approvedAt).format(DATE_DISPLAY_FORMAT);

  // Process collaborating specialists
  const collaboratingSpecialists = collabReportSpecialists
    ? collabReportSpecialists.map((cs) => cs.specialist?.fullName || cs.specialist?.name).filter(Boolean).join(', ')
    : 'None provided';

  // Process approvers
  const approvingManagers = approvers
    ? approvers.map((a) => a.user?.fullName).filter(Boolean).join(', ')
    : 'None provided';

  const creator = author?.fullName || 'Unknown';

  const formattedStates = statesInvolved?.map((activityStateCode) => STATES[activityStateCode] || '').join(', ') || '';
  const formattedReasons = reportReasons?.map((reasonId) => COLLAB_REPORT_REASONS[reasonId] || '').join(', ');
  const formattedGoals = reportGoals?.map((goal) => goal?.goalTemplate?.standard || '').join(', ');
  const formattedDataUsed = dataUsed?.map(({ collabReportDatum }) => {
    if (collabReportDatum === 'other') {
      return `Other: ${otherDataUsed}`;
    }

    return COLLAB_REPORT_DATA[collabReportDatum] || '';
  }).join(', ');
  const formattedParticipants = participants.map((p) => {
    if (p === 'Other' && otherParticipants) {
      return `Other: ${otherParticipants}`;
    }
    return p;
  }).join(', ');

  const activityType = isStateActivity ? 'State' : 'Regional';

  return (
    <div data-testid="submitted-collab-report">
      <Container className="ttahub-collab-report-view margin-top-2">
        <h1 className="landing margin-top-0 margin-bottom-4">
          Collaboration report
          {displayId && (
          <>
            {' '}
            {displayId}
          </>
          )}
        </h1>

        <div className="ttahub-collab-report-view-creator-data margin-bottom-4">
          <p>
            <strong>Creator:</strong>
            {' '}
            {creator}
          </p>
          <p>
            <strong>Collaborators:</strong>
            {' '}
            {collaboratingSpecialists}
          </p>
          <p>
            <strong>Managers:</strong>
            {' '}
            {approvingManagers}
          </p>
          <p>
            <strong>Date created:</strong>
            {' '}
            {formattedCreatedAt}
          </p>
          {(submissionStatus === REPORT_STATUSES.SUBMITTED) && (
          <p>
            <strong>Date submitted:</strong>
            {' '}
            {formattedSubmittedAt}
          </p>
          )}
          {(calculatedStatus === REPORT_STATUSES.APPROVED) && (
          <p>
            <strong>Date approved:</strong>
            {' '}
            {formattedApprovedAt}
          </p>
          )}
        </div>

        <ReadOnlyContent
          title="Activity summary"
          sections={[
            {
              data: {
                'Activity name': activityName,
              },
            },
            {
              heading: 'Activity date',
              data: {
                'Start date': formattedStartDate,
                'End date': formattedEndDate,
                Duration: formattedDuration,
              },
              striped: false,
            },
            {
              heading: 'Reason for activity',
              data: {
                'Activity purpose': formattedReasons,
                'Activity type': activityType,
                ...(isStateActivity ? { 'States involved': formattedStates } : {}
                ),
                'Activity description': description,
              },
              striped: false,
            },
          ]}
        />

        <ReadOnlyContent
          title="Supporting information"
          sections={[
            {
              data: {
                Participants: formattedParticipants,
                'Data collected/shared': formattedDataUsed,
                'Supporting goals': formattedGoals,
              },
              striped: false,
            },
          ]}
        />

        <ReadOnlyContent
          title="Next steps"
          sections={formatNextSteps(steps)}
        />

      </Container>
    </div>
  );
}

SubmittedCollabReport.propTypes = {
  report: PropTypes.shape({
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    creatorName: PropTypes.string,
    displayId: PropTypes.string,
    link: PropTypes.string,
    stepDetailsWithDates: PropTypes.string,
    purpose: PropTypes.string,
    id: PropTypes.number,
    userId: PropTypes.number,
    lastUpdatedById: PropTypes.number,
    regionId: PropTypes.number,
    name: PropTypes.string,
    submissionStatus: PropTypes.string,
    calculatedStatus: PropTypes.string,
    duration: PropTypes.number,
    isStateActivity: PropTypes.bool,
    conductMethod: PropTypes.arrayOf(PropTypes.string),
    description: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    submittedAt: PropTypes.string,
    deletedAt: PropTypes.string,
    approvedAt: PropTypes.string,
    author: PropTypes.shape({
      fullName: PropTypes.string,
      nameWithNationalCenters: PropTypes.string,
      id: PropTypes.number,
      homeRegionId: PropTypes.number,
      hsesUserId: PropTypes.string,
      hsesUsername: PropTypes.string,
      hsesAuthorities: PropTypes.string,
      name: PropTypes.string,
      phoneNumber: PropTypes.string,
      email: PropTypes.string,
      flags: PropTypes.arrayOf(PropTypes.string),
      lastLogin: PropTypes.string,
      createdAt: PropTypes.string,
      updatedAt: PropTypes.string,
    }),
    reportGoals: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        collabReportId: PropTypes.number,
        goalTemplateId: PropTypes.number,
        createdAt: PropTypes.string,
        updatedAt: PropTypes.string,
        deletedAt: PropTypes.string,
      }),
    ),
    dataUsed: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        collabReportId: PropTypes.number,
        collabReportDatum: PropTypes.string,
        createdAt: PropTypes.string,
        updatedAt: PropTypes.string,
        deletedAt: PropTypes.string,
      }),
    ),
    otherDataUsed: PropTypes.string,
    participants: PropTypes.arrayOf(PropTypes.string),
    otherParticipants: PropTypes.string,
    steps: PropTypes.arrayOf(
      PropTypes.shape({
        collabStepCompleteDate: PropTypes.string,
        collabStepDetail: PropTypes.string,
      }),
    ),
    reportReasons: PropTypes.arrayOf(
      PropTypes.string,
    ),
    statesInvolved: PropTypes.arrayOf(
      PropTypes.string,
    ),
    collabReportSpecialists: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        collabReportId: PropTypes.number,
        specialistId: PropTypes.number,
        createdAt: PropTypes.string,
        updatedAt: PropTypes.string,
        deletedAt: PropTypes.string,
        specialist: PropTypes.shape({
          fullName: PropTypes.string,
          nameWithNationalCenters: PropTypes.string,
          id: PropTypes.number,
          homeRegionId: PropTypes.number,
          hsesUserId: PropTypes.string,
          hsesUsername: PropTypes.string,
          name: PropTypes.string,
          phoneNumber: PropTypes.string,
          email: PropTypes.string,
          flags: PropTypes.arrayOf(PropTypes.string),
          lastLogin: PropTypes.string,
          createdAt: PropTypes.string,
          updatedAt: PropTypes.string,
        }),
      }),
    ),
    approvers: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        status: PropTypes.string,
        note: PropTypes.string,
        user: PropTypes.shape({
          fullName: PropTypes.string,
          id: PropTypes.number,
          name: PropTypes.string,
        }),
      }),
    ),
  }).isRequired,
};
