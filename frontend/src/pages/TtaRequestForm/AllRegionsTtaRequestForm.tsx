import React, { useCallback } from 'react';
import { getTtaRequestRecipientAndGrantsByUser } from '../../fetchers/recipient';
import useFetch from '../../hooks/useFetch';
import TtaRequestForm from './index';
import type { TtaRequestRecipient } from './types';

const NO_RECIPIENTS: TtaRequestRecipient[] = [];

/**
 * The TTA request form as it is reached from the TTA requests page, where the recipient
 * still has to be chosen from every recipient the user can see.
 */
export default function AllRegionsTtaRequestForm(): React.ReactElement {
  const fetcher = useCallback(() => getTtaRequestRecipientAndGrantsByUser(), []);
  const { data: recipients } = useFetch(
    NO_RECIPIENTS,
    fetcher,
    [],
    'Unable to load recipients.',
    true
  );

  return (
    <TtaRequestForm recipientOptions={recipients || NO_RECIPIENTS} backLinkTo="/tta-requests" />
  );
}
