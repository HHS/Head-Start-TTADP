import React, { useEffect, useState } from 'react';
import dp from './dataProvider';
import RequestErrors, { RequestErrorShow } from './requestErrors';
import Container from '../../components/Container';
import './diag.css';

function Diag() {
  const [Admin, setAdmin] = useState(null);
  const [Resource, setResource] = useState(null);

  useEffect(() => {
    const importRA = async () => {
      const RA = await import('react-admin');
      setAdmin(() => RA.Admin);
      setResource(() => RA.Resource);
    };

    importRA();
  }, []);

  if (!Admin || !Resource) return <div>Page is Loading...</div>;

  return (
    <>
      <Container paddingX={0} paddingY={0} className="smart-hub--overflow-auto">
        <Admin dataProvider={dp}>
          <Resource name="requestErrors" list={RequestErrors} edit={RequestErrorShow} />
        </Admin>
      </Container>
    </>
  );
}
export default Diag;
