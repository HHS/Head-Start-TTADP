import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import SpecialistRole from '../SpecialistRole';

describe('specialistrole select', () => {
  const renderSpecialistRole = (onChange = jest.fn()) => {
    const validateSpecialistRole = jest.fn();

    render(<SpecialistRole
      error={<></>}
      onChange={onChange}
      selectedRoles={['lion tamer']}
      inputName="specialist-select"
      validateSpecialistRole={validateSpecialistRole}
      roleOptions={[
        { id: 1, fullName: 'Tiger tester' },
        { id: 2, fullName: 'lion tamer' },
      ]}
    />);
  };

  it('you can select a specialist role', async () => {
    const onChange = jest.fn();
    renderSpecialistRole(onChange);
    const select = await screen.findByLabelText(/Specialist roles providing TTA/i);
    await selectEvent.select(select, 'Tiger tester');
    expect(onChange).toHaveBeenCalled();
  });
});
