import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import selectEvent from 'react-select-event';
import RegionalSelect from '../RegionalSelect';

const renderRegionalSelect = () => {
  const history = createMemoryHistory();
  const onApplyRegion = jest.fn();

  render(
    <Router history={history}>
      <RegionalSelect
        regions={[1, 2]}
        onApply={onApplyRegion}
      />
    </Router>,
  );
  return history;
};

describe('Regional Select', () => {
  test('displays correct region in input', async () => {
    renderRegionalSelect();
    const input = await screen.findByText(/region 1/i);
    expect(input).toBeVisible();
  });

  test('changes input value on apply', async () => {
    renderRegionalSelect();
    let input = await screen.findByText(/region 1/i);
    expect(input).toBeVisible();
    await selectEvent.select(screen.getByText(/region 1/i), [/region 2/i]);
    const applyButton = await screen.findByText(/apply/i);
    fireEvent.click(applyButton);
    input = await screen.findByText(/region 2/i);
    expect(input).toBeVisible();
  });
});
