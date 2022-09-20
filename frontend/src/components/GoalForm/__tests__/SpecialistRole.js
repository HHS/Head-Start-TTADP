import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import SpecialistRole from '../SpecialistRole';

describe('specialistrole select', () => {
  const defaultSelection = [{ fullName: 'lion tamer', id: 1, onAnyReport: true }];
  const renderSpecialistRole = (
    onChange = jest.fn(),
    selectedRoles = defaultSelection,
    objectiveStatus = 'In Progress',
    goalStatus = 'In Progress',
  ) => {
    const validateSpecialistRole = jest.fn();

    render(<SpecialistRole
      error={<></>}
      isOnApprovedReport={false}
      isOnReport
      onChange={onChange}
      selectedRoles={selectedRoles}
      inputName="specialist-select"
      status={objectiveStatus}
      goalStatus={goalStatus}
      validateSpecialistRole={validateSpecialistRole}
      roleOptions={[
        {
          id: 1, fullName: 'Tiger tester', onAnyReport: false, onApprovedReport: false,
        },
        {
          id: 2, fullName: 'lion tamer', onAnyReport: true, onApprovedReport: false,
        },
      ]}
    />);
  };

  it('you can select a specialist role', async () => {
    const onChange = jest.fn();
    renderSpecialistRole(onChange, []);
    const select = await screen.findByLabelText(/Specialist roles providing TTA/i);
    await selectEvent.select(select, ['Tiger tester']);
    expect(onChange).toHaveBeenCalled();
  });

  it('displays unused data', async () => {
    const onChange = jest.fn();
    renderSpecialistRole(
      onChange,
      [{ fullName: 'lion tamer', id: 1, onAnyReport: false }],
      'Completed',
      'Closed',
    );
    expect(await screen.findByText(/specialist roles/i)).toBeVisible();
    expect(await screen.findByText(/lion tamer/i)).toBeVisible();
    expect(document.querySelectorAll('.ttahub-objective-list-item--unused-data').length).toBe(1);
  });
});
