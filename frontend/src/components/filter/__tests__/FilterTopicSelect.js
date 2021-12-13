import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterTopicSelect from '../FilterTopicSelect';

const { findByText } = screen;

describe('FilterTopicSelect', () => {
  const renderTopicSelect = (onApply) => (
    render(
      <FilterTopicSelect
        onApply={onApply}
        inputId="curly"
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderTopicSelect(onApply);

    const select = await findByText(/Select topics to filter by/i);
    await selectEvent.select(select, ['Transition Practices']);
    expect(onApply).toHaveBeenCalledWith(['Transition Practices']);
  });
});
