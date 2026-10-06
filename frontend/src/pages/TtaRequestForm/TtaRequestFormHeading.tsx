import { Grid } from '@trussworks/react-uswds';
import React from 'react';
import BackLink from '../../components/BackLink';

interface TtaRequestFormHeadingProps {
  /** where "Back to TTA Requests" returns the user to */
  backLinkTo: string;
}

/**
 * The back link, page title and status tag above the request card, laid out the way the
 * other report forms lay theirs out. A request is always a draft while it is being
 * written, so the tag is not yet driven by anything.
 */
export default function TtaRequestFormHeading({
  backLinkTo,
}: TtaRequestFormHeadingProps): React.ReactElement {
  return (
    <>
      <BackLink to={backLinkTo}>Back to TTA Requests</BackLink>
      <Grid row>
        <Grid col="auto">
          <div className="margin-top-3 margin-bottom-5">
            <h1 className="font-serif-2xl text-bold line-height-serif-2 margin-0">
              Training and Technical Assistance (TTA) Request
            </h1>
          </div>
        </Grid>
        <Grid col="auto" className="flex-align-self-center">
          <div className="smart-hub-status-label smart-hub--status-draft bg-gray-5 padding-x-2 padding-y-105 font-sans-md text-bold margin-bottom-2 margin-left-2">
            Draft
          </div>
        </Grid>
      </Grid>
    </>
  );
}
