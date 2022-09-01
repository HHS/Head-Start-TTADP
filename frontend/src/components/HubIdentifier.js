import React from 'react';
import {
  Identifier,
  IdentifierIdentity,
  IdentifierLinks,
  IdentifierMasthead,
  Link,
} from '@trussworks/react-uswds';

import './HubIdentifier.scss';

export default function HubIdentifier() {
  return (
    <div className="smart-hub-identifier">
      <Identifier className="">
        <IdentifierMasthead aria-label="Agency Identifier">
          <IdentifierIdentity domain="ttahub.ohs.acf.hhs.gov">
            An official website of the Office of Head Start
          </IdentifierIdentity>
        </IdentifierMasthead>
        <IdentifierLinks navProps={{ 'aria-label': 'Important links' }}>
          <Link href="/" className="text-primary-lighter">Vulnerability Disclosure Policy</Link>
        </IdentifierLinks>
        {/* <IdentifierGov aria-label="U.S. government information and services">
          ok
        </IdentifierGov> */}
      </Identifier>
    </div>
  );
}
