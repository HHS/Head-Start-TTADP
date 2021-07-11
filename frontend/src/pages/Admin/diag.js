import React from 'react';
import {
  Admin, Resource,
} from 'react-admin';
import dp from './dataProvider';
import RequestErrors, { RequestErrorShow } from './requestErrors';
import Container from '../../components/Container';
import './diag.css';

function Diag() {
  return (
    <>
      <Container padding={0} className="smart-hub--overflow-auto">
        <Admin dataProvider={dp}>
          <Resource name="requestErrors" list={RequestErrors} edit={RequestErrorShow} />
        </Admin>
      </Container>
    </>
  );
}
export default Diag;
