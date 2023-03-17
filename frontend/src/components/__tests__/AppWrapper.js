import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import AppWrapper from '../AppWrapper';

describe('AppWrapper', () => {
  it('renders something when there are no props', async () => {
    render(<AppWrapper><h1>This is a test</h1></AppWrapper>);
    const heading = await screen.findByRole('heading', { name: 'This is a test' });
    expect(heading).toBeInTheDocument();
    expect(heading.parentElement).not.toHaveAttribute('role', 'main');
  });

  it('properly renders an authenticated child', async () => {
    render(<AppWrapper authenticated><h1>This is a test</h1></AppWrapper>);
    const heading = await screen.findByRole('heading', { name: 'This is a test' });
    expect(heading).toBeInTheDocument();
    expect(heading.parentElement).toHaveAttribute('role', 'main');
    expect(heading.parentElement.parentElement).toHaveClass('padding-3 tablet:padding-5');
  });

  it('properly renders a non-padded child', async () => {
    render(<AppWrapper authenticated padded={false}><h1>This is a test</h1></AppWrapper>);
    const heading = await screen.findByRole('heading', { name: 'This is a test' });
    expect(heading).toBeInTheDocument();
    expect(heading.parentElement).toHaveAttribute('role', 'main');
    expect(heading.parentElement.parentElement).toHaveClass('padding-x-3 padding-bottom-3 tablet:padding-x-5 tablet:padding-bottom-5');
  });
});
