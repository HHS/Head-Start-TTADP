import React from 'react';
import { SUPPORT_TYPES } from '@ttahub/common';
import { render, fireEvent } from '@testing-library/react';
import ObjectiveSupportType from '../ObjectiveSupportType';

describe('ObjectiveSupportType', () => {
  const supportType = 'test support type';
  const onChangeSupportType = jest.fn();
  const onBlurSupportType = jest.fn();
  const inputName = 'testInput';
  const error = <div>Error message</div>;

  it('calls onChangeSupportType when support type is changed', () => {
    const { getByLabelText } = render(
      <ObjectiveSupportType
        supportType={supportType}
        onChangeSupportType={onChangeSupportType}
        onBlurSupportType={onBlurSupportType}
        inputName={inputName}
        error={error}
      />,
    );

    const dropdown = getByLabelText(/Support type/i);
    fireEvent.change(dropdown, { target: { value: SUPPORT_TYPES[3] } });
    expect(onChangeSupportType).toHaveBeenCalledWith(SUPPORT_TYPES[3]);
  });

  it('calls onBlurSupportType when support type dropdown loses focus', () => {
    const { getByLabelText } = render(
      <ObjectiveSupportType
        supportType={supportType}
        onChangeSupportType={onChangeSupportType}
        onBlurSupportType={onBlurSupportType}
        inputName={inputName}
        error={error}
      />,
    );

    const dropdown = getByLabelText(/Support type/i);
    fireEvent.blur(dropdown);
    expect(onBlurSupportType).toHaveBeenCalled();
  });
});
