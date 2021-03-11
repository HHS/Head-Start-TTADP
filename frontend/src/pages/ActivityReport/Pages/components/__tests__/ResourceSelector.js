/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';

import ResourceSelector from '../ResourceSelector';

// eslint-disable-next-line react/prop-types
const RenderResourceSelector = ({ data }) => {
  const hookForm = useForm({
    defaultValues: {
      name: data,
    },
  });
  return (
    <FormProvider {...hookForm}>
      <ResourceSelector
        name="name"
        ariaName="name"
      />
    </FormProvider>
  );
};

describe('ResourceSelector', () => {
  it('can have a resource added', async () => {
    render(<RenderResourceSelector data={[{ value: 'test' }]} />);
    const addResource = await screen.findByRole('button', { name: 'Add New Resource' });
    userEvent.click(addResource);
    const text = await screen.findAllByRole('textbox');
    expect(text.length).toBe(2);
  });

  it('prevents adding of additional resources if one resource is empty', async () => {
    render(<RenderResourceSelector data={[{ value: '' }]} />);
    const addResource = await screen.findByRole('button');
    userEvent.click(addResource);
    const text = await screen.findAllByRole('textbox');
    expect(text.length).toBe(1);
  });

  describe('with a single entry', () => {
    it('hides the delete button', async () => {
      render(<RenderResourceSelector data={[{ value: 'test' }]} />);
      const remove = screen.queryByRole('button', { name: 'remove name 1' });
      await waitFor(() => expect(remove).toBeNull());
    });
  });

  describe('with multiple entries', () => {
    it('allows removal of an item', async () => {
      render(<RenderResourceSelector data={[{ value: 'first' }, { value: 'second' }]} />);
      const text = await screen.findAllByRole('textbox');
      expect(text.length).toBe(2);
      const remove = screen.queryByRole('button', { name: 'remove name 1' });
      userEvent.click(remove);
      const newText = await screen.findAllByRole('textbox');
      expect(newText.length).toBe(1);
    });
  });
});
