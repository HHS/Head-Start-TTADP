import { APPROVER_STATUSES, TTA_REQUEST_STATUSES } from '@ttahub/common';
import moment from 'moment';
import React, { useCallback, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Redirect, useParams } from 'react-router-dom';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import TtaRequestNotesSummary from '../../components/TtaRequestNotesSummary';
import { toNotesSummary } from '../../components/TtaRequestNotesSummary/notes';
import { getTtaRequest } from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import { canApproveTtaRequest } from '../../permissions';
import UserContext from '../../UserContext';
import TtaRequestFormHeading from '../TtaRequestForm/TtaRequestFormHeading';
import type { TtaRequestResponse } from '../TtaRequestForm/types';
import TtaRequestApproval from './TtaRequestApproval';
import TtaRequestAssignmentSummary from './TtaRequestAssignmentSummary';
import TtaRequestDetails from './TtaRequestDetails';
import TtaRequestReview from './TtaRequestReview';
// the read-only view is laid out as the activity report's is
import '../ApprovedActivityReport/index.scss';

const formatDate = (date: string | null | undefined) =>
  date ? moment(date).format(DATE_DISPLAY_FORMAT) : '';

interface ViewTtaRequestProps {
  /** the list the request was opened from, all regions' or a recipient's */
  backLinkTo?: string;
}

/**
 * A submitted TTA request, read only, with every note left on it. The reviewer reviews it
 * here once it has been submitted to them: they can edit its details in place, assign staff
 * to it, and send it back to its creator or on to a COR for approval. A primary or backup COR
 * in its region then approves it, which creates its goals, or sends it back to the reviewer.
 */
export default function ViewTtaRequest({
  backLinkTo = '/tta-requests',
}: ViewTtaRequestProps): React.ReactElement | null {
  const { ttaRequestId } = useParams<{ ttaRequestId: string }>();
  const { user } = useContext(UserContext);

  const fetchTtaRequest = useCallback(
    (): Promise<TtaRequestResponse> => getTtaRequest(Number(ttaRequestId)),
    [ttaRequestId]
  );
  const {
    data: ttaRequest,
    error,
    statusCode,
  } = useFetch(null, fetchTtaRequest, [ttaRequestId], undefined, true) as {
    data: TtaRequestResponse | null;
    error: string;
    statusCode: number | null;
  };

  // useFetch sets the error a render before the status code, so wait for both
  if (error) {
    return statusCode ? <Redirect to={`/something-went-wrong/${statusCode}`} /> : null;
  }

  if (!ttaRequest) {
    return null;
  }

  const { displayId } = ttaRequest;
  const canReview =
    ttaRequest.status === TTA_REQUEST_STATUSES.SUBMITTED &&
    !!user &&
    ttaRequest.reviewer?.id === user.id;
  const canApprove = canApproveTtaRequest(user, ttaRequest);
  const notesSummary = <TtaRequestNotesSummary notes={toNotesSummary(ttaRequest.notes)} />;

  // the reviewer or COR is mid-review, so there is nothing finished to share or print yet
  if (canReview || canApprove) {
    return (
      <div className="maxw-widescreen">
        <Helmet>
          <title>TTA Request {displayId}</title>
        </Helmet>
        <TtaRequestFormHeading backLinkTo={backLinkTo} />
        <Container className="width-tablet" paddingX={3} paddingY={3}>
          {canReview ? (
            <TtaRequestReview ttaRequest={ttaRequest} backLinkTo={backLinkTo}>
              {notesSummary}
            </TtaRequestReview>
          ) : (
            <TtaRequestApproval ttaRequest={ttaRequest} backLinkTo={backLinkTo}>
              {notesSummary}
            </TtaRequestApproval>
          )}
        </Container>
      </div>
    );
  }

  // it is only finished, and so worth sharing or printing, once its COR has approved it
  const approver = ttaRequest.approvers?.[0];
  const isApproved = approver?.status === APPROVER_STATUSES.APPROVED;
  const userName = (stepUser?: { name: string; fullName?: string } | null) =>
    stepUser?.fullName ?? stepUser?.name;

  return (
    <div className="maxw-widescreen">
      <Helmet>
        <title>TTA Request {displayId}</title>
      </Helmet>
      <BackLink to={backLinkTo}>Back to TTA Requests</BackLink>
      {isApproved && <ApprovedReportSpecialButtons />}
      <Container className="ttahub-activity-report-view margin-top-2">
        <h1 className="landing">TTA Request {displayId}</h1>
        <div className="ttahub-activity-report-view-creator-data margin-bottom-4">
          <p>
            <strong>Creator:</strong> {userName(ttaRequest.creator)}
          </p>
          <p>
            <strong>Reviewer:</strong> {userName(ttaRequest.reviewer)}
          </p>
          {approver && (
            <p>
              <strong>Approver:</strong> {userName(approver.user)}
            </p>
          )}
          <p className="no-print">
            <strong>Date created:</strong> {formatDate(ttaRequest.createdAt)}
          </p>
          {ttaRequest.submittedAt && (
            <p>
              <strong>Date submitted:</strong> {formatDate(ttaRequest.submittedAt)}
            </p>
          )}
        </div>
        <h2 className="font-serif-xl margin-top-0 margin-bottom-1">TTA Request summary</h2>
        {/* 24px below the request's context, whichever section comes next */}
        <TtaRequestDetails ttaRequest={ttaRequest} headingLevel={3} compactEnd />
        <TtaRequestAssignmentSummary ttaRequest={ttaRequest} flushTop />
        {notesSummary}
      </Container>
    </div>
  );
}
