import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Container from '../../components/Container';
import RequestErrors from './components/RequestErrors';
import RequestError from './components/RequestError';

function Diag() {
  return (
    <Container>
      <Routes>
        <Route path=":errorId" element={<RequestError />} />
        <Route path="*" element={<RequestErrors />} />
      </Routes>
    </Container>
  );
}
export default Diag;
