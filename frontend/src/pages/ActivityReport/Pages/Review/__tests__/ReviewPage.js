/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import ReviewPage from '../ReviewPage';
import { REPORT_STATUSES } from '../../../../../Constants';

const sections = [
  {
    title: 'first',
    anchor: 'first',
    items: [
      {
        label: 'array',
        name: 'array',
        sort: true,
      },
      {
        label: 'single value',
        name: 'single',
      },
      {
        label: 'object',
        name: 'object',
        path: 'test',
      },
      {
        label: 'link',
        name: 'link',
      },
    ],
  },
  {
    title: 'second',
    anchor: 'second',
    items: [],
  },
];

const values = {
  array: ['two', 'one'],
  single: 'value',
  object: { test: 'test' },
  link: 'https://www.google.com/awesome',
  calculatedStatus: REPORT_STATUSES.DRAFT,
};

const RenderReviewPage = ({ defaultValues = values }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
    shouldUnregister: false,
  });
  return (
    <BrowserRouter>
      <FormProvider {...hookForm}>
        <ReviewPage
          sections={sections}
          path="id"
        />
      </FormProvider>
    </BrowserRouter>
  );
};

describe('ReviewPage', () => {
  it('does not display the "edit" link if the report is not editable', async () => {
    render(<RenderReviewPage defaultValues={
      { ...values, calculatedStatus: REPORT_STATUSES.APPROVED }
    }
    />);
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Edit form section "first"' })).toBeNull());
  });

  describe('with an editable report', () => {
    beforeEach(() => {
      render(<RenderReviewPage />);
    });

    it('separates sections as distinct UI elements', async () => {
      expect(await screen.findByText('first')).toBeVisible();
      expect(await screen.findByText('second')).toBeVisible();
    });

    it('properly sets the "Edit" links target', async () => {
      const linkOne = await screen.findByRole('link', { name: 'Edit form section "first"' });
      expect(linkOne).toHaveAttribute('href', '/id#first');
      const linkTwo = await screen.findByRole('link', { name: 'Edit form section "second"' });
      expect(linkTwo).toHaveAttribute('href', '/id#second');
    });

    it('displays arrays of values', async () => {
      const first = await screen.findByLabelText('array 1');
      expect(first).toHaveTextContent('one');
      const second = await screen.findByLabelText('array 2');
      expect(second).toHaveTextContent('two');
    });

    it('displays string values', async () => {
      const value = await screen.findByLabelText('single value 1');
      expect(value).toHaveTextContent('value');
    });

    it('displays link values', async () => {
      const value = await screen.findByLabelText('link 1');
      expect(value).toHaveTextContent('https://www.google.com/awesome');
    });

    it('displays an objects value (via method call)', async () => {
      const value = await screen.findByLabelText('object 1');
      expect(value).toHaveTextContent('test');
    });
  });

  describe('renders with goverment link', () => {
    it('displays gov link values', async () => {
      const govValues = {
        array: ['one', 'two'],
        single: 'value',
        object: { test: 'test' },
        link: 'https://awesome.ohs.acf.hhs.gov',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      };
      render(<RenderReviewPage defaultValues={govValues} />);
      const value = await screen.findByLabelText('link 1');
      expect(value).toHaveTextContent('https://awesome.ohs.acf.hhs.gov');
    });
  });
});
