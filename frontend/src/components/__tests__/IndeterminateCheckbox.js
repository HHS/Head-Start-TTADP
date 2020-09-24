import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import IndeterminateCheckbox from '../IndeterminateCheckbox';

describe('IndeterminateCheckbox', () => {
  test('indeterminate can be false', () => {
    render(<IndeterminateCheckbox label="false" id="id" name="name" checked indeterminate={false} onChange={() => {}} />);
    expect(screen.getByLabelText('false').indeterminate).toBeFalsy();
  });

  test('indeterminate can be true', () => {
    render(<IndeterminateCheckbox label="true" id="id" name="name" checked indeterminate onChange={() => {}} />);
    expect(screen.getByLabelText('true').indeterminate).toBeTruthy();
  });

  test('can be disabled', () => {
    render(<IndeterminateCheckbox label="checkbox" id="id" name="name" checked={false} indeterminate={false} disabled onChange={() => {}} />);
    expect(screen.getByLabelText('checkbox')).toBeDisabled();
  });

  test('onChange includes indeterminate', () => {
    let result = false;
    const onChange = (e, indeterminate) => {
      result = indeterminate;
    };
    render(<IndeterminateCheckbox label="checkbox" id="id" name="name" checked={false} indeterminate onChange={onChange} />);
    const checkbox = screen.getByLabelText('checkbox');
    fireEvent.click(checkbox);
    expect(result).toBeTruthy();
  });
});
