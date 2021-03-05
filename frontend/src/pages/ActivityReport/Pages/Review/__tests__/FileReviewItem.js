/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import FileReviewItem from '../FileReviewItem';

// eslint-disable-next-line react/prop-types
const RenderFileReviewItem = ({ status = 'APPROVED' }) => (
  <FileReviewItem
    filename="filename"
    url="http://localhost:3000"
    status={status}
  />
);

describe('ReviewPage', () => {
  it('displays the filename', async () => {
    render(<RenderFileReviewItem />);
    const item = await screen.findByText('filename');
    expect(item).toBeVisible();
  });

  it('displays the download link', async () => {
    render(<RenderFileReviewItem />);
    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', 'http://localhost:3000');
  });

  it('displays "not approved" if the file has not been approved', async () => {
    render(<RenderFileReviewItem status="" />);
    const status = await screen.findByText('Not Approved');
    expect(status).toBeVisible();
  });
});
