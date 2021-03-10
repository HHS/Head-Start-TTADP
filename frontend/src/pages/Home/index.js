import React from 'react';
import { Helmet } from 'react-helmet';

import UserContext from '../../UserContext';
import Container from '../../components/Container';

function Home() {
  return (
    <>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <UserContext.Consumer>
        {({ user }) => (
          <Container>
            <h1>
              Welcome to the TTA Smart Hub
              {' '}
              {user.name}
            </h1>
          </Container>
        )}
      </UserContext.Consumer>
    </>
  );
}

export default Home;
