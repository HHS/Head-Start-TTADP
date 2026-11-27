import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import moment from 'moment';
import React from 'react';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import type { TtaRequestResponse } from '../TtaRequestForm/types';

// the reviewer has sent the request on to the COR, and so submitted their review
const SENT_TO_COR: string[] = [
  TTA_REQUEST_STATUSES.AWAITING_APPROVAL,
  TTA_REQUEST_STATUSES.APPROVED,
];

const formatDate = (date: string | null | undefined) =>
  date ? moment(date).format(DATE_DISPLAY_FORMAT) : '';

interface TtaRequestAssignmentSummaryProps {
  ttaRequest: TtaRequestResponse;
  /** leave out the space above the first heading, for a page that sets it itself */
  flushTop?: boolean;
}

/**
 * The reviewer's part of a request, read only, laid out as they saw it in TtaRequestReview: the
 * staff they assigned, and the date it was submitted once they sent it on to the COR
 */
export default function TtaRequestAssignmentSummary({
  ttaRequest,
  flushTop = false,
}: TtaRequestAssignmentSummaryProps): React.ReactElement {
  const hasAssignedStaff = !!ttaRequest.assignedStaff?.length;
  const headingClassName = (isFirst: boolean) =>
    `${flushTop && isFirst ? 'margin-top-0' : 'margin-top-4'} margin-bottom-3`;

  return (
    <>
      {hasAssignedStaff && (
        <>
          <h2 className={headingClassName(true)}>TTA assignment</h2>
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
      {SENT_TO_COR.includes(ttaRequest.status) && (
        <>
          <h2 className={headingClassName(!hasAssignedStaff)}>Review and submit</h2>
          <dl className="margin-top-0 margin-bottom-3">
            <dt className="text-bold">Date submitted</dt>
            <dd className="margin-0">{formatDate(ttaRequest.submittedAt)}</dd>
          </dl>
        </>
      )}
    </>
  );
}
