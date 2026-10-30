import { Button } from '@trussworks/react-uswds';
import moment from 'moment';
import React, { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Redirect, useParams } from 'react-router-dom';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import ReadOnlyContent from '../../components/ReadOnlyContent';
import TtaRequestNotesSummary, {
  type TtaRequestNote,
} from '../../components/TtaRequestNotesSummary';
import { getTtaRequest } from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import type { TtaRequestResponse } from '../TtaRequestForm/types';
import './ViewTtaRequest.css';

const formatDate = (date: string | null | undefined) =>
  date ? moment(date).format(DATE_DISPLAY_FORMAT) : '';

const recipientAwareLabel = (recipientAware: boolean | null) => {
  if (recipientAware === null) {
    return '';
  }
  return recipientAware ? 'Yes' : 'No';
};

const goalLabel = (goalTemplate: TtaRequestResponse['goalTemplate']) => {
  if (!goalTemplate) {
    return '';
  }
  const { standard, templateName } = goalTemplate;
  return standard ? `(${standard}) ${templateName}` : templateName;
};

const citationLabel = ({ citation, findingType }: TtaRequestResponse['citations'][number]) =>
  findingType ? `${findingType} - ${citation}` : citation;

// only the creator's submission is recorded so far; review and approval phases come later
const buildNotes = ({
  creator,
  submittedAt,
  creatorNotes,
}: TtaRequestResponse): TtaRequestNote[] =>
  submittedAt
    ? [
        {
          key: 'creator-submission',
          phase: 'Draft TTA Request',
          author: creator?.fullName ?? creator?.name ?? '',
          role: 'Creator',
          date: submittedAt,
          note: creatorNotes,
        },
      ]
    : [];

// TODO(TTAHUB-5884): temporary sample notes for checking the notes summary layout. Remove before merging.
const SAMPLE_NOTES: Omit<TtaRequestNote, 'key'>[] = [
  {
    phase: 'TTA Request review - needs action',
    author: 'Monica Geller, TTAC',
    role: 'Reviewer',
    date: '2026-06-23T10:05:00.000Z',
    note: 'Please add the agenda details we discussed.',
  },
  {
    phase: 'Draft TTA Request',
    author: 'Rachel Green, ECS',
    role: 'Creator',
    date: '2026-06-23T12:43:00.000Z',
    note: 'Agenda details have been added.',
  },
  {
    phase: 'Send to COR for approval',
    author: 'Monica Geller, TTAC',
    role: 'Reviewer',
    date: '2026-06-23T15:56:00.000Z',
    note: 'Adding Chandler because I know you will be out later this week.',
  },
  {
    phase: 'TTA Request - needs action',
    author: 'Joey Tribbiano, COR',
    role: 'Approver',
    date: '2026-06-24T09:28:00.000Z',
    note: 'Update the context with the recent change in scope.',
  },
  {
    phase: 'Send to COR for approval',
    author: 'Monica Geller, TTAC',
    role: 'Reviewer',
    date: '2026-06-24T10:02:00.000Z',
    note: 'Context updated.',
  },
  {
    phase: 'TTA Request - approved',
    author: 'Joey Tribbiano, COR',
    role: 'Approver',
    date: '2026-06-24T11:40:00.000Z',
    note: 'Looks good!',
  },
];

interface ViewTtaRequestProps {
  /** the list the request was opened from, all regions' or a recipient's */
  backLinkTo?: string;
}

/**
 * A submitted TTA request, read only. The approver, assigned staff and goals only exist once
 * a request has been approved, so they aren't shown yet.
 */
export default function ViewTtaRequest({
  backLinkTo = '/tta-requests',
}: ViewTtaRequestProps): React.ReactElement | null {
  const { ttaRequestId } = useParams<{ ttaRequestId: string }>();
  // TODO(TTAHUB-5884): temporary, remove with SAMPLE_NOTES
  const [sampleNotes, setSampleNotes] = useState<TtaRequestNote[]>([]);
  const addSampleNotes = () =>
    setSampleNotes((current) => [
      ...current,
      ...SAMPLE_NOTES.map((note, index) => ({ ...note, key: `sample-${current.length + index}` })),
    ]);

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

  return (
    <div className="maxw-widescreen">
      <Helmet>
        <title>TTA Request {displayId}</title>
      </Helmet>
      <BackLink to={backLinkTo}>Back to TTA Requests</BackLink>
      <div className="margin-top-2">
        <ApprovedReportSpecialButtons />
      </div>
      <Container className="width-tablet margin-top-2" paddingX={4} paddingY={4}>
        <h1 className="font-serif-2xl margin-top-0 margin-bottom-4">TTA Request {displayId}</h1>
        <div className="margin-bottom-4">
          <p>
            <strong>Creator:</strong> {ttaRequest.creator?.fullName ?? ttaRequest.creator?.name}
          </p>
          <p>
            <strong>Reviewer:</strong> {ttaRequest.reviewer?.fullName ?? ttaRequest.reviewer?.name}
          </p>
          <p>
            <strong>Date Created:</strong> {formatDate(ttaRequest.createdAt)}
          </p>
          {ttaRequest.submittedAt && (
            <p>
              <strong>Date submitted:</strong> {formatDate(ttaRequest.submittedAt)}
            </p>
          )}
        </div>
        <ReadOnlyContent
          title="Who is the request for?"
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
          className="ttahub-view-tta-request__goal-and-context"
          sections={[
            {
              data: {
                "Recipient's Goal": goalLabel(ttaRequest.goalTemplate),
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
        <TtaRequestNotesSummary notes={[...buildNotes(ttaRequest), ...sampleNotes]} />
        {/* TODO(TTAHUB-5884): temporary, remove with SAMPLE_NOTES */}
        <Button type="button" unstyled className="margin-top-2" onClick={addSampleNotes}>
          Add sample notes
        </Button>
      </Container>
    </div>
  );
}
