import { TTA_REQUEST_STATUSES } from '@ttahub/common';
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
import UserContext from '../../UserContext';
import type { TtaRequestResponse } from '../TtaRequestForm/types';
import TtaRequestDetails from './TtaRequestDetails';
import TtaRequestReview from './TtaRequestReview';

const formatDate = (date: string | null | undefined) =>
  date ? moment(date).format(DATE_DISPLAY_FORMAT) : '';

interface ViewTtaRequestProps {
  /** the list the request was opened from, all regions' or a recipient's */
  backLinkTo?: string;
}

/**
 * A submitted TTA request, read only, with every note left on it. The reviewer reviews it
 * here once it has been submitted to them: they can edit its details in place, assign staff
 * to it, and send it back to its creator or on to a COR for approval. Goals only exist once a
 * request has been approved, so they aren't shown yet.
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
  const notesSummary = <TtaRequestNotesSummary notes={toNotesSummary(ttaRequest.notes)} />;

  // the reviewer is mid-review, so there is nothing finished to share or print yet
  if (canReview) {
    return (
      <div className="maxw-widescreen">
        <Helmet>
          <title>TTA Request {displayId}</title>
        </Helmet>
        <BackLink to={backLinkTo}>Back to TTA Requests</BackLink>
        <Container className="width-tablet margin-top-2" paddingX={3} paddingY={3}>
          <TtaRequestReview ttaRequest={ttaRequest} backLinkTo={backLinkTo}>
            {notesSummary}
          </TtaRequestReview>
        </Container>
      </div>
    );
  }

  return (
    <div className="maxw-widescreen">
      <Helmet>
        <title>TTA Request {displayId}</title>
      </Helmet>
      <BackLink to={backLinkTo}>Back to TTA Requests</BackLink>
      <div>
        <ApprovedReportSpecialButtons />
      </div>
      <Container className="width-tablet margin-top-2" paddingX={3} paddingY={3}>
        <h1 className="font-serif-2xl margin-top-0 margin-bottom-4">TTA Request {displayId}</h1>
        <dl className="margin-top-0 margin-bottom-4">
          <div className="display-flex margin-bottom-1">
            <dt className="text-bold margin-right-1">Creator:</dt>
            <dd className="margin-0">{ttaRequest.creator?.fullName ?? ttaRequest.creator?.name}</dd>
          </div>
          <div className="display-flex margin-bottom-1">
            <dt className="text-bold margin-right-1">Reviewer:</dt>
            <dd className="margin-0">
              {ttaRequest.reviewer?.fullName ?? ttaRequest.reviewer?.name}
            </dd>
          </div>
          <div className="display-flex margin-bottom-1">
            <dt className="text-bold margin-right-1">Date Created:</dt>
            <dd className="margin-0">{formatDate(ttaRequest.createdAt)}</dd>
          </div>
          {ttaRequest.submittedAt && (
            <div className="display-flex margin-bottom-1">
              <dt className="text-bold margin-right-1">Date submitted:</dt>
              <dd className="margin-0">{formatDate(ttaRequest.submittedAt)}</dd>
            </div>
          )}
        </dl>
        <TtaRequestDetails ttaRequest={ttaRequest} />
        {/* laid out as the reviewer saw it, see TtaRequestReview */}
        {!!ttaRequest.assignedStaff?.length && (
          <>
            <h2 className="font-serif-lg margin-top-4 margin-bottom-3">TTA assignment</h2>
            <dl className="margin-top-0 margin-bottom-3">
              <dt className="text-bold">Assigned specialist</dt>
              {ttaRequest.assignedStaff.map((staff) => (
                <dd key={staff.id} className="margin-0">
                  {staff.fullName ?? staff.name}
                </dd>
              ))}
            </dl>
          </>
        )}
        {ttaRequest.status === TTA_REQUEST_STATUSES.AWAITING_APPROVAL && (
          <>
            <h2 className="font-serif-lg margin-top-4 margin-bottom-3">Review and submit</h2>
            <dl className="margin-top-0 margin-bottom-3">
              <dt className="text-bold">Date submitted</dt>
              <dd className="margin-0">{formatDate(ttaRequest.submittedAt)}</dd>
            </dl>
          </>
        )}
        {notesSummary}
      </Container>
    </div>
  );
}
