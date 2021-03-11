/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import ReviewPage from '../ReviewPage';

const sections = [
  {
    title: 'first',
    anchor: 'first',
    items: [
      {
        label: 'array',
        name: 'array',
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
    ],
  },
  {
    title: 'second',
    anchor: 'second',
    items: [],
  },
];

const values = {
  array: ['one', 'two'],
  single: 'value',
  object: { test: 'test' },
};

const RenderReviewPage = () => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: values,
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
  beforeEach(() => {
    render(
      <RenderReviewPage />,
    );
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

  it('displays an objects value (via method call)', async () => {
    const value = await screen.findByLabelText('object 1');
    expect(value).toHaveTextContent('test');
  });
});
