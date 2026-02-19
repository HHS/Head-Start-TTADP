/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OverviewWidgetField } from '../OverviewWidgetField';

jest.mock('../../components/ContentFromFeedByTag', () => function MockContentFromFeedByTag({ tagName }) {
  return (
    <div data-testid="feed-by-tag">
      Feed for
      {' '}
      {tagName}
    </div>
  );
});

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
    </BrowserRouter>,
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
    expect(screen.getByRole('heading', { name: baseProps.label1, hidden: true })).toBeInTheDocument();
  });
});
