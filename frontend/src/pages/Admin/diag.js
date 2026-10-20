import { createHashHistory } from 'history';
import React from 'react';
import { Admin, Resource } from 'react-admin';
import Container from '../../components/Container';
import DiagLayout from './DiagLayout';
import dp from './dataProvider';
import { monitoringDiagnosticResources } from './monitoringDiagResources';
import RequestErrors, { RequestErrorShow } from './requestErrors';
import './diag.css';

const adminHistory = createHashHistory();
const requestErrorOptions = { label: 'Request Errors' };
const diagnosticResources = monitoringDiagnosticResources.map((resource) => ({
  ...resource,
  options: { label: resource.label },
}));

function Diag() {
  return (
    <>
      <Container paddingX={0} paddingY={0} className="smart-hub-admin-diag">
        <Admin dataProvider={dp} layout={DiagLayout} history={adminHistory}>
          <Resource
            name="requestErrors"
            options={requestErrorOptions}
            list={RequestErrors}
            edit={RequestErrorShow}
          />
          {diagnosticResources.map((resource) => (
            <Resource
              key={resource.name}
              name={resource.name}
              options={resource.options}
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
