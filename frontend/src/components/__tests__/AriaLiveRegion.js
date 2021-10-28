import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import AriaLiveRegion from '../AriaLiveRegion';

describe('AriaLiveRegion', () => {
  it('renders an empty div by default', async () => {
    render(<AriaLiveRegion />);

    expect(await screen.findByRole('status')).toBeInTheDocument();
    const textMatches = screen.queryAllByText(/^.+$/);
    expect(textMatches).toHaveLength(0);
  });

  it('renders messages as paragraphs', async () => {
    const messages = [
      'Message One',
      'Message Two',
    ];
    render(<AriaLiveRegion messages={messages} />);

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Message One')).toBeInTheDocument();
    expect(await screen.findByText('Message Two')).toBeInTheDocument();
  });
});
