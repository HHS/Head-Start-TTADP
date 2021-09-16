import React from 'react';
import { Helmet } from 'react-helmet';
import Container from '../../components/Container';
import './Flags.css';

export default function Flags() {
  return (
    <div>
      <Helmet>
        <title>User Administration</title>
      </Helmet>
      <Container>
        <main>
          <h2>Active feature flags</h2>
          <ul>
            <li className="flag-label">
              <strong>Feature flag 1</strong>
              {' '}
              - Active for &nbsp;
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a href="#">48 users</a>
            </li>
            <li className="flag-label">
              <strong>Feature flag 2 </strong>
              - Active for &nbsp;
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a href="#">12 users</a>
            </li>
          </ul>
          <h2>Inactive feature flags</h2>
          <ul>
            <li className="flag-label">
              Feature flag 3
            </li>
          </ul>
        </main>
      </Container>
    </div>
  );
}
