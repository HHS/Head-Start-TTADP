import React from 'react';
import { Helmet } from 'react-helmet';
import Container from '../../components/Container';
import UserContext from '../../UserContext';

function Home() {
  return (
    <>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <UserContext.Consumer>
        {({ user }) => (
          <>
            <Container>
              <h1>Welcome to the TTA Hub, {user.name}</h1>
            </Container>
          </>
        )}
      </UserContext.Consumer>
    </>
  );
}

export default Home;
