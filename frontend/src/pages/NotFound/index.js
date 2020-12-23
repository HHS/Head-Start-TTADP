import React from 'react';
import { Alert } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Container from '../../components/Container';

function NotFound() {
  return (
    <Container>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <Alert type="error" heading="Not Found">
        Page Not Found, please go to the
        {' '}
        <Link to="/">Home page</Link>
      </Alert>
    </Container>
  );
}

export default NotFound;
