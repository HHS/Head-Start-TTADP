/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { OverviewWidgetField } from '../OverviewWidgetField';

jest.mock(
  '../../components/ContentFromFeedByTag',
  () =>
    function MockContentFromFeedByTag({ tagName }) {
      return <div data-testid="feed-by-tag">Feed for {tagName}</div>;
    }
);

const mockIcon = {
  prefix: 'fas',
  iconName: 'user',
  icon: [512, 512, [], 'f007', 'M'],
};

const baseProps = {
  label1: 'Recipients with priority indicators',
  data: '34%',
  icon: mockIcon,
  iconColor: '#000',
  backgroundColor: '#fff',
};

function renderField(extraProps = {}) {
  return render(
    <BrowserRouter>
      <OverviewWidgetField
        label1={baseProps.label1}
        data={baseProps.data}
        icon={baseProps.icon}
        iconColor={baseProps.iconColor}
        backgroundColor={baseProps.backgroundColor}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...extraProps}
      />
    </BrowserRouter>
  );
}

describe('OverviewWidgetField', () => {
  it('does not render "About this data" button when drawerTagName is not provided', () => {
    renderField();
    expect(screen.queryByText('About this data')).not.toBeInTheDocument();
  });

  it('renders "About this data" button when drawerTagName is provided', () => {
    renderField({ drawerTagName: 'ttahub-spotlight-priority-indicators' });
    expect(screen.getByRole('button', { name: 'About this data' })).toBeInTheDocument();
  });

  it('renders the drawer with feed content when drawerTagName is provided', () => {
    renderField({ drawerTagName: 'ttahub-spotlight-priority-indicators' });
    expect(screen.getByTestId('feed-by-tag')).toBeInTheDocument();
    expect(screen.getByText(/ttahub-spotlight-priority-indicators/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: baseProps.label1, hidden: true })
    ).toBeInTheDocument();
  });

  it('uses default no-results drawer configuration when config is not provided', () => {
    renderField({
      showNoResults: true,
      data: '0%',
      route: {
        to: '/dashboards/qa-dashboard/recipients-with-no-tta',
        label: 'Display details',
        ariaLabel: 'Display details about recipients without TTA',
      },
    });

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Get help using filters')).toBeInTheDocument();
    expect(screen.getByText(/ttahub-qa-dash-filters/)).toBeInTheDocument();
    expect(screen.queryByText('Display details')).not.toBeInTheDocument();
  });

  it('uses custom no-results drawer configuration when provided', () => {
    renderField({
      showNoResults: true,
      data: '0%',
      noResultsDrawerConfig: {
        title: 'Active deficient citations with TTA support',
        tagName: 'ttahub-regional-dash-monitoring-filters',
      },
    });

    expect(
      screen.getByRole('heading', {
        name: 'Active deficient citations with TTA support',
        hidden: true,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/ttahub-regional-dash-monitoring-filters/)).toBeInTheDocument();
  });
});
