import React from 'react';
import { Helmet } from 'react-helmet';
import UserContext from '../../UserContext';
import Container from '../../components/Container';
import Llama from './Llama';

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
              <h1>
                Welcome to the TTA Hub,
                {' '}
                {user.name}
              </h1>
            </Container>
            <Llama user={user} />
          </>
        )}
      </UserContext.Consumer>
    </>
  );
}

export default Home;
