import '@testing-library/jest-dom';
import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectPagination } from '../SelectPagination';

describe('SelectPagination', () => {
  const renderSelectPagination = (handlePageChange = () => {}, perPageChange = () => {}) => {
    render(<SelectPagination
      title="Testing"
      offset={0}
      perPage={10}
      activePage={1}
      count={20}
      handlePageChange={handlePageChange}
      perPageChange={perPageChange}
    />);
  };

  it('renders correctly', async () => {
    renderSelectPagination();
    expect(await screen.findByText(/1-10 of 20/i)).toBeVisible();
    expect(await screen.findByLabelText(/pagination for testing/i)).toBeVisible();
    expect(await screen.findByRole('link', { name: /go to previous page/i })).toBeVisible();
    expect(await screen.findByRole('link', { name: /go to next page/i })).toBeVisible();
    expect(await screen.findByText(/showing 1-10 of 20 testing/i)).toBeVisible();
  });

  it('handles page change', async () => {
    const nextPage = jest.fn();
    renderSelectPagination(nextPage);

    const nextPageBtn = await screen.findByRole('link', { name: /go to next page/i });
    userEvent.click(nextPageBtn);
    await waitFor(() => expect(nextPage).toHaveBeenCalled());

    const firstPageBtn = await screen.findByRole('link', { name: /go to page number 1/i });
    userEvent.click(firstPageBtn);
    await waitFor(() => expect(nextPage).toHaveBeenCalled());
  });

  it('handles per page change', async () => {
    const perPage = jest.fn();
    renderSelectPagination(() => {}, perPage);
    const perPageDropDown = await screen.findByTestId('perPage');
    userEvent.selectOptions(perPageDropDown, '25');
    await waitFor(() => expect(perPage).toHaveBeenCalled());
  });
});
