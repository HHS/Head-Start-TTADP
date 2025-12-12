import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import RecipientSpotlightDashboard from '../RecipientSpotlightDashboard';

describe('Recipient spotlight Dashboard page', () => {
  const renderTest = () => {
    render(<RecipientSpotlightDashboard />);
  };

  it('renders without crashing', async () => {
    renderTest();

    // Check for placeholder content
    expect(screen.getByText(/recipient spotlight dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/content coming soon/i)).toBeInTheDocument();
  });
});
