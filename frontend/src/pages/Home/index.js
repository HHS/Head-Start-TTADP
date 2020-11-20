import React from 'react';
import { Route } from 'react-router-dom';
import { Button } from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import UserContext from '../../UserContext';
import Container from '../../components/Container';

function Home() {
  return (
    <Route exact path="/">
      <Helmet>
        <title>Home</title>
      </Helmet>
      <UserContext.Consumer>
        {({ user, logout }) => (
          <Container>
            <h1>
              Welcome to the TTA Smart Hub
              {' '}
              {user.name}
            </h1>
            <Button onClick={() => logout(false)}>
              Logout
            </Button>
          </Container>
        )}
      </UserContext.Consumer>
    </Route>
  );
}

export default Home;
