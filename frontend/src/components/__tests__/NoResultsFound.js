import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import NoResultsFound from '../NoResultsFound';

describe('NoResultsFound', () => {
  test('renders correctly', () => {
    render(<NoResultsFound />);
    expect(screen.getByText('No results found.')).toBeDefined();
    expect(screen.getByText('Try removing or changing the selected filters.')).toBeDefined();
    expect(screen.getByText('Get help using filters')).toBeDefined();
  });

  test('renders with custom message', () => {
    const customMessage = 'This is a custom message';
    render(<NoResultsFound customMessage={customMessage} />);
    expect(screen.getByText('No results found.')).toBeDefined();
    expect(screen.getByText(customMessage)).toBeDefined();
    expect(screen.getByText('Get help using filters')).toBeDefined();
  });

  test('hides filter help when hideFilterHelp is true', () => {
    render(<NoResultsFound hideFilterHelp />);
    expect(screen.getByText('No results found.')).toBeDefined();
    expect(screen.getByText('Try removing or changing the selected filters.')).toBeDefined();
    expect(screen.queryByText('Get help using filters')).not.toBeInTheDocument();
  });
});
