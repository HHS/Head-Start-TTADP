import React from 'react';
import { SUPPORT_TYPES } from '@ttahub/common';
import { render, fireEvent } from '@testing-library/react';
import ObjectiveSupportType from '../ObjectiveSupportType';
import UserContext from '../../UserContext';

describe('ObjectiveSupportType', () => {
  const supportType = 'test support type';
  const onChangeSupportType = jest.fn();
  const onBlurSupportType = jest.fn();
  const inputName = 'testInput';
  const error = <div>Error message</div>;

  const renderTest = () => render(
    <UserContext.Provider value={{ user: { flags: [] } }}>
      <ObjectiveSupportType
        supportType={supportType}
        onChangeSupportType={onChangeSupportType}
        onBlurSupportType={onBlurSupportType}
        inputName={inputName}
        error={error}
      />
    </UserContext.Provider>,
  );

  it('calls onChangeSupportType when support type is changed', () => {
    const { getByRole } = renderTest();

    const dropdown = getByRole('combobox', { name: /Support type/i });
    fireEvent.change(dropdown, { target: { value: SUPPORT_TYPES[3] } });
    expect(onChangeSupportType).toHaveBeenCalledWith(SUPPORT_TYPES[3]);
  });

  it('calls onBlurSupportType when support type dropdown loses focus', () => {
    const { getByRole } = renderTest();

    const dropdown = getByRole('combobox', { name: /Support type/i });
    fireEvent.blur(dropdown);
    expect(onBlurSupportType).toHaveBeenCalled();
  });
});
