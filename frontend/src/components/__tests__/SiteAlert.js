import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ReadOnlyEditor from '../ReadOnlyEditor';
import SiteAlert from '../SiteAlert';

describe('SiteAlert', () => {
  const renderAlert = (message, variant = 'info', size = 'standard') =>
    render(
      <SiteAlert heading="What's the impact of team turnover?" variant={variant} size={size}>
        <ReadOnlyEditor value={message} ariaLabel="alert for the tta hub: " />
      </SiteAlert>
    );

  it('renders the heading and message in a single text container', () => {
    renderAlert('<p>Join us July 29th for a webinar.</p>');

    const heading = screen.getByRole('heading', { name: "What's the impact of team turnover?" });
    const message = screen.getByText('Join us July 29th for a webinar.');
    const text = heading.closest('.usa-alert__text');

    expect(text).toBeInTheDocument();
    expect(text).toContainElement(message);
  });

  it('renders links in the message', () => {
    renderAlert('<p>Please <a href="https://example.com/signup">sign up</a> now!</p>');

    expect(screen.getByRole('link', { name: 'sign up' })).toHaveAttribute(
      'href',
      'https://example.com/signup'
    );
  });

  it('applies the variant and size classes', () => {
    renderAlert('<p>Message</p>', 'emergency', 'slim');

    const alert = screen.getByTestId('siteAlert');
    expect(alert).toHaveClass('usa-site-alert--emergency');
    expect(alert).toHaveClass('usa-site-alert--ttahub__slim');
  });

  it('runs the heading inline for standard and slim alerts', () => {
    renderAlert('<p>Message</p>', 'info', 'slim');

    expect(screen.getByRole('heading')).toHaveClass('display-inline', 'font-sans-xs');
  });

  it('stacks a larger heading above the message for large alerts', () => {
    renderAlert('<p>Message</p>', 'info', 'large');

    expect(screen.getByRole('heading')).toHaveClass('display-block', 'font-sans-lg');
  });
});
