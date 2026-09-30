import { DECIMAL_BASE } from '@ttahub/common';
import React, { useMemo } from 'react';
import usePossibleGrants from '../../hooks/usePossibleGrants';
import TtaRequestForm from './index';
import type { TtaRequestRecipient } from './types';

interface RecipientTtaRequestFormProps {
  /** the recipient record the request was started from */
  recipient: {
    id?: number;
    recipientId: string;
    recipientName: string;
    grants?: { id: number; regionId: number; status: string; numberWithProgramTypes: string }[];
  };
  regionId: string;
}

/**
 * The TTA request form as it is reached from a recipient's TTA records, where the recipient
 * is already known and only their grants are in question.
 */
export default function RecipientTtaRequestForm({
  recipient,
  regionId,
}: RecipientTtaRequestFormProps): React.ReactElement {
  const possibleGrants = usePossibleGrants(recipient);

  const formRecipient: TtaRequestRecipient = useMemo(
    () => ({
      id: recipient.id ?? parseInt(recipient.recipientId, DECIMAL_BASE),
      name: recipient.recipientName,
      grants: possibleGrants,
    }),
    [recipient.id, recipient.recipientId, recipient.recipientName, possibleGrants]
  );

  // the only recipient on offer, so the select shows who the request is for, already chosen
  const recipientOptions = useMemo(() => [formRecipient], [formRecipient]);

  return (
    <TtaRequestForm
      recipient={formRecipient}
      recipientOptions={recipientOptions}
      regionId={parseInt(regionId, DECIMAL_BASE)}
      backLinkTo={`/recipient-tta-records/${recipient.recipientId}/region/${regionId}/tta-request`}
    />
  );
}
