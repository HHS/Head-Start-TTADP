import '@testing-library/jest-dom';
import React from 'react';
// import fetchMock from 'fetch-mock'; commenting out, we will need it real soon
import { render, screen } from '@testing-library/react';
import CommunicationLog from '../CommunicationLog';

describe('CommunicationLog', () => {
  const renderTest = () => {
    render(<CommunicationLog recipientName="Big recipient" recipientId={1} regionId={5} />);
  };

  it('renders the communication log approriately', async () => {
    renderTest();

    expect(screen.getByText('Communication Log')).toBeInTheDocument();
  });
});
