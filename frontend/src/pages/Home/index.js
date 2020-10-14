import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { Button } from '@trussworks/react-uswds';

import UserContext from '../../UserContext';
import Container from '../../components/Container';

function Home() {
  return (
    <Switch>
      <Route exact path="/">
        <UserContext.Consumer>
          {({ user, logout }) => (
            <Container>
              <h1>
                Welcome to the TTA Smart Hub
                {' '}
                {user.name}
              </h1>
              <Button onClick={logout}>
                Logout
              </Button>
            </Container>
          )}
        </UserContext.Consumer>
      </Route>
    </Switch>
  );
}

export default Home;
