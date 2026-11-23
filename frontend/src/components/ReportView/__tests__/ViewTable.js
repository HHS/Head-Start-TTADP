import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ViewTable from '../ViewTable';

describe('ViewTable', () => {
  const headings = ['Attachments', 'Resources'];
  const data = (href) => [<a href={href}>Attachment</a>, <a href={`${href}-resource`}>Resource</a>];

  it('keeps a focused link when the table re-renders with refreshed data', () => {
    const { rerender } = render(
      <ViewTable caption="Report" headings={headings} data={data('/a')} />
    );
    const link = screen.getByRole('link', { name: 'Attachment' });
    link.focus();
    expect(link).toHaveFocus();

    rerender(<ViewTable caption="Report" headings={headings} data={data('/b')} />);

    const refreshed = screen.getByRole('link', { name: 'Attachment' });
    expect(refreshed).toBe(link);
    expect(refreshed).toHaveAttribute('href', '/b');
    expect(refreshed).toHaveFocus();
  });
});
