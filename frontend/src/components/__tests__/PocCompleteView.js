/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PocCompleteView from '../PocCompleteView';

describe('PocCompleteView', () => {
  const renderPocCompleteView = (userId) => render(
    <PocCompleteView
      reportType="duck"
      userId={userId}
      formData={{
        pocCompleteDate: '2021-02-01',
        pocCompleteId: 1,
      }}
    >
      <h1>Child Heading</h1>
    </PocCompleteView>,
  );

  it('renders correct message when user is poc who completed', () => {
    renderPocCompleteView(1);
    expect(screen.getByText('You completed your portion of the duck report on 02/01/2021 and sent an email to the event creator and collaborator')).toBeInTheDocument();
  });

  it('renders correct message when user is not poc who completed', () => {
    renderPocCompleteView(2);
    expect(screen.getByText('A regional point of contact completed your portion of the duck report on 02/01/2021 and sent an email to the event creator and collaborator')).toBeInTheDocument();
  });
});
