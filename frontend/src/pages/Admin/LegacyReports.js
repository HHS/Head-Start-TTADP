import React, { useState, useContext } from 'react';
import { Alert } from '@trussworks/react-uswds';
import Container from '../../components/Container';
import { synchronizeLegacyUsers } from '../../fetchers/Admin';
import AppLoadingContext from '../../AppLoadingContext';

export default function LegacyReports() {
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const [message, setMessage] = useState(null);

  const synchonize = async () => {
    try {
      setIsAppLoading(true);
      const { message: response } = await synchronizeLegacyUsers();
      setMessage({
        type: 'success',
        text: response,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: `There was an error synchronizing legacy users: ${err.message}`,
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <Container>
      <h1>Legacy Reports</h1>
      <div>
        <p className="usa-prose">
          Legacy reports were not imported with corresponding user linkages.
          Synchronize user data if you want to run a script that links users to legacy reports
          based on the email addresses in the &quot;createdBy&quot;, &quot;manager&quot;,
          and &quot;modifiedBy&quot; fields.
        </p>
        <p className="usa-prose">
          <strong>You should only click this button if you know what you are doing</strong>
          .
        </p>
        <p className="usa-prose">
          There are over 5100 legacy reports. This process can take around 5
          full minutes to complete. Please be patient!
        </p>
        {message ? <Alert type={message.type}>{message.text}</Alert> : null}
        <button type="button" className="usa-button" onClick={synchonize}>
          Synchonize user data
        </button>
      </div>
    </Container>
  );
}
