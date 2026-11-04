import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ReadOnlyContent from '../ReadOnlyContent';

describe('ReadOnlyContent', () => {
  const renderContent = (props = {}) =>
    render(
      <ReadOnlyContent
        title="Test title"
        sections={[{ heading: 'Test heading', data: { 'Row title': 'Row data' } }]}
        {...props}
      />
    );

  const getSection = () =>
    screen.getByText('Test heading').closest('.ttahub-read-only-content-section');

  it('uses the default spacing', () => {
    renderContent();

    expect(screen.getByRole('heading', { name: 'Test title' })).toHaveClass('margin-bottom-3');
    expect(getSection()).toHaveClass('padding-bottom-3');
    expect(screen.getByText('Row data').closest('div')).toHaveClass('margin-bottom-2');
  });

  it('applies custom spacing', () => {
    renderContent({ spacing: { title: 2, section: 0, row: 3 } });

    expect(screen.getByRole('heading', { name: 'Test title' })).toHaveClass('margin-bottom-2');
    expect(getSection()).toHaveClass('padding-bottom-0');
    expect(screen.getByText('Row data').closest('div')).toHaveClass('margin-bottom-3');
  });

  it('keeps the defaults for any spacing not passed', () => {
    renderContent({ spacing: { section: 1 } });

    expect(screen.getByRole('heading', { name: 'Test title' })).toHaveClass('margin-bottom-3');
    expect(getSection()).toHaveClass('padding-bottom-1');
    expect(screen.getByText('Row data').closest('div')).toHaveClass('margin-bottom-2');
  });
});
