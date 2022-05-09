/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import SpecialistRole from '../SpecialistRole';

describe('SpecialistRole', () => {
  const renderSpecialistRole = (onChange) => {
    render(<SpecialistRole
      onChange={onChange}
      error={<></>}
      selectedRoles={['Tiger', 'Lion']}
      inputName="specialistRole"
      validateSpecialistRole={jest.fn()}
      options={['Tiger', 'Lion', 'Bear']}
    />);
  };

  it('renders and calls the correct function', async () => {
    const onChange = jest.fn();
    renderSpecialistRole(onChange);

    const select = await screen.findByLabelText(/Specialist role/i);
    await selectEvent.select(select, ['Bear']);

    expect(onChange).toHaveBeenCalledWith(['Tiger', 'Lion', 'Bear']);
  });
});
