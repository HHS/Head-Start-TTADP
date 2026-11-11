import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import moment from 'moment';
import React, { useCallback, useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Alert } from '@trussworks/react-uswds';
import { Link, Redirect, useParams } from 'react-router-dom';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import ReadOnlyContent from '../../components/ReadOnlyContent';
import TtaRequestNotesSummary from '../../components/TtaRequestNotesSummary';
import { nameWithRole, toNotesSummary } from '../../components/TtaRequestNotesSummary/notes';
import { getTtaRequest } from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import { canReviewerEditTtaRequest } from '../../permissions';
import UserContext from '../../UserContext';
import type { TtaRequestResponse } from '../TtaRequestForm/types';
import TtaRequestReview from './TtaRequestReview';

const formatDate = (date: string | null | undefined) =>
  date ? moment(date).format(DATE_DISPLAY_FORMAT) : '';

const recipientAwareLabel = (recipientAware: boolean | null) => {
  if (recipientAware === null) {
    return '';
  }
  return recipientAware ? 'Yes' : 'No';
};

const citationLabel = ({ citation, findingType }: TtaRequestResponse['citations'][number]) =>
  findingType ? `${findingType} - ${citation}` : citation;

interface ViewTtaRequestProps {
  /** the list the request was opened from, all regions' or a recipient's */
  backLinkTo?: string;
}

/**
 * A submitted TTA request, read only, with every note left on it. The reviewer reviews it
 * here once it has been submitted to them: they can edit its details on the form, assign staff
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

  const { displayId, citations } = ttaRequest;
  const canReview =
    ttaRequest.status === TTA_REQUEST_STATUSES.SUBMITTED &&
    !!user &&
    ttaRequest.reviewer?.id === user.id;
  const notesSummary = <TtaRequestNotesSummary notes={toNotesSummary(ttaRequest.notes)} />;

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
        {canReview ? (
          <>
            <h1 className="font-serif-2xl margin-top-0 margin-bottom-1">TTA Request summary</h1>
            <IndicatesRequiredField />
            <Alert type="info" headingLevel="h4" slim className="margin-bottom-4">
              {nameWithRole(ttaRequest.creator)} is asking for a review of this TTA request. Please
              view all information, then assign a specialist and select a review status.
            </Alert>
          </>
        ) : (
          <>
            <h1 className="font-serif-2xl margin-top-0 margin-bottom-4">TTA Request {displayId}</h1>
            <dl className="margin-top-0 margin-bottom-4">
              <div className="display-flex margin-bottom-1">
                <dt className="text-bold margin-right-1">Creator:</dt>
                <dd className="margin-0">
                  {ttaRequest.creator?.fullName ?? ttaRequest.creator?.name}
                </dd>
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
          </>
        )}
        <ReadOnlyContent
          title="Who is the request for?"
          spacing={{ section: 0, row: 3 }}
          titleAction={
            canReviewerEditTtaRequest(user, ttaRequest) ? (
              // the recipient can change too, so the request opens where any can be chosen
              <Link to={`/tta-requests/${ttaRequest.id}`} className="usa-link">
                Edit request
              </Link>
            ) : null
          }
          sections={[
            {
              data: {
                // one grant per line, without the bullets an array would get
                'Recipient grant': (
                  <>
                    {ttaRequest.grants.map((grant) => (
                      <div key={grant.id}>{grant.name}</div>
                    ))}
                  </>
                ),
                'Recipient aware of request': recipientAwareLabel(ttaRequest.recipientAware),
                'Request originator': ttaRequest.originator ?? '',
              },
            },
          ]}
        />
        <ReadOnlyContent
          title="Goal and context"
          spacing={{ title: 2, section: 1 }}
          sections={[
            {
              data: {
                // curated template names already lead with their standard, e.g. "(Monitoring) ..."
                "Recipient's Goal": ttaRequest.goalTemplate?.templateName ?? '',
                'Request background or context': ttaRequest.context ?? '',
                ...(citations.length
                  ? {
                      'Citations addressed': (
                        <ul className="usa-list margin-0">
                          {citations.map((citation) => (
                            <li key={`${citation.findingType}::${citation.citation}`}>
                              {citationLabel(citation)}
                            </li>
                          ))}
                        </ul>
                      ),
                    }
                  : {}),
              },
            },
          ]}
        />
        {/* laid out as the reviewer saw it, see TtaRequestReview */}
        {!canReview && !!ttaRequest.assignedStaff?.length && (
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
        {!canReview && ttaRequest.status === TTA_REQUEST_STATUSES.AWAITING_APPROVAL && (
          <>
            <h2 className="font-serif-lg margin-top-4 margin-bottom-3">Review and submit</h2>
            <dl className="margin-top-0 margin-bottom-3">
              <dt className="text-bold">Date submitted</dt>
              <dd className="margin-0">{formatDate(ttaRequest.submittedAt)}</dd>
            </dl>
          </>
        )}
        {canReview ? (
          <TtaRequestReview ttaRequest={ttaRequest} backLinkTo={backLinkTo}>
            {notesSummary}
          </TtaRequestReview>
        ) : (
          notesSummary
        )}
      </Container>
    </div>
  );
}
