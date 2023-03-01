import React from 'react';
import { Helmet } from 'react-helmet';
import UserContext from '../../UserContext';
import Container from '../../components/Container';
import Llama from './Llama';
import FeatureFlag from '../../components/FeatureFlag';

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
            <FeatureFlag flag="anv_statistics">
              <Llama user={user} />
            </FeatureFlag>
          </>
        )}
      </UserContext.Consumer>
    </>
  );
}

export default Home;
