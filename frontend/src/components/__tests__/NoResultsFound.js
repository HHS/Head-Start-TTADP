/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import NoResultsFound from '../NoResultsFound';

jest.mock('../Drawer', () => ({ title, children }) => (
  <div data-testid="no-results-drawer" data-title={title}>
    {children}
  </div>
));

jest.mock('../ContentFromFeedByTag', () => ({ tagName }) => (
  <div data-testid="no-results-feed-content" data-tag-name={tagName} />
));

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

  test('passes provided drawerConfig through to Drawer and ContentFromFeedByTag', () => {
    const drawerConfig = {
      title: 'Monitoring dashboard filters',
      tagName: 'ttahub-monitoring-dash-filters',
    };

    render(<NoResultsFound drawerConfig={drawerConfig} />);

    expect(screen.getByTestId('no-results-drawer')).toHaveAttribute('data-title', drawerConfig.title);
    expect(screen.getByTestId('no-results-feed-content')).toHaveAttribute('data-tag-name', drawerConfig.tagName);
  });

  test.each([
    ['null', null],
    ['empty object', {}],
    ['missing tagName', { title: 'Monitoring dashboard filters' }],
    ['empty tagName', { title: 'Monitoring dashboard filters', tagName: '' }],
  ])('hides filter help when drawerConfig is invalid (%s)', (_, drawerConfig) => {
    render(<NoResultsFound drawerConfig={drawerConfig} />);

    expect(screen.queryByText('Get help using filters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-results-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-results-feed-content')).not.toBeInTheDocument();
  });
});
