import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FilterInput from '../FilterInput';

// eslint-disable-next-line react/prop-types
const RenderFilterInput = ({ onChange = () => {} }) => (
  <FilterInput onChange={onChange} />
);

describe('FilterInput', () => {
  it('calls "onChange" when the filter changes', async () => {
    const onChange = jest.fn();
    render(<RenderFilterInput onChange={onChange} />);
    const text = await screen.findByRole('textbox');
    userEvent.type(text, 'a');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });
});
