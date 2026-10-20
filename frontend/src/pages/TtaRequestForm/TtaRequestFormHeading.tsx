import React from 'react';
import BackLink from '../../components/BackLink';

interface TtaRequestFormHeadingProps {
  /** where "Back to TTA Requests" returns the user to */
  backLinkTo: string;
}

/**
 * The back link and page title above the request card, laid out the way the
 * other report forms lay theirs out.
 */
export default function TtaRequestFormHeading({
  backLinkTo,
}: TtaRequestFormHeadingProps): React.ReactElement {
  return (
    <>
      <BackLink to={backLinkTo}>Back to TTA Requests</BackLink>
      <div className="margin-top-3 margin-bottom-5">
        <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
          Training and Technical Assistance (TTA) Request
        </h1>
      </div>
    </>
  );
}
