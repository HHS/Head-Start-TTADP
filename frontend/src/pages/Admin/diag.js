import React from 'react';
import { Admin, Resource } from 'react-admin';
import dp from './dataProvider';
import RequestErrors, { RequestErrorShow } from './requestErrors';
import { monitoringDiagnosticResources } from './monitoringDiagResources';
import Container from '../../components/Container';
import './diag.css';

function Diag() {
  return (
    <>
      <Container paddingX={0} paddingY={0} className="smart-hub-admin-diag">
        <Admin dataProvider={dp}>
          <Resource
            name="requestErrors"
            options={{ label: 'Request Errors' }}
            list={RequestErrors}
            edit={RequestErrorShow}
          />
          {monitoringDiagnosticResources.map((resource) => (
            <Resource
              key={resource.name}
              name={resource.name}
              options={{ label: resource.label }}
              list={resource.list}
              show={resource.show}
            />
          ))}
        </Admin>
      </Container>
    </>
  );
}
export default Diag;
