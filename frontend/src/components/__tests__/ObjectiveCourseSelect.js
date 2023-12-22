import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import userEvent from '@testing-library/user-event';
import ObjectiveCourseSelect from '../ObjectiveCourseSelect';

describe('ObjectiveCourseSelect', () => {
  const renderObjectiveCourseSelect = (
    onChange = jest.fn(),
    value = [],
    useIpdCourse = true,
    onChangeUseIpdCourses = jest.fn(),
    onBlur = jest.fn(),
    onBlurUseIpdCourses = jest.fn(),
  ) => render((
    <ObjectiveCourseSelect
      error={<></>}
      onBlur={onBlur}
      onChange={onChange}
      value={value}
      isLoading={false}
      onChangeUseIpdCourses={onChangeUseIpdCourses}
      onBlurUseIpdCourses={onBlurUseIpdCourses}
      useIpdCourse={useIpdCourse}
    />
  ));

  it('updates use courses', async () => {
    const onChangeUseIpdCourses = jest.fn();
    await act(() => waitFor(() => {
      renderObjectiveCourseSelect(
        jest.fn(),
        [],
        false,
        onChangeUseIpdCourses,
      );
    }));

    const radio = screen.getByLabelText(/yes/i);
    act(() => {
      userEvent.click(radio);
    });

    expect(onChangeUseIpdCourses).toHaveBeenCalledWith(true);
  });

  it('clears selection on "no"', async () => {
    const onChangeUseIpdCourses = jest.fn();
    const onChange = jest.fn();

    await act(() => waitFor(() => {
      renderObjectiveCourseSelect(
        onChange,
        [],
        true,
        onChangeUseIpdCourses,
      );
    }));

    const radio = screen.getByLabelText(/no/i);
    act(() => {
      userEvent.click(radio);
    });

    expect(onChangeUseIpdCourses).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('updates course selection', async () => {
    const onChange = jest.fn();
    await act(() => waitFor(() => {
      renderObjectiveCourseSelect(
        onChange,
        [{ id: 6, name: 'Ongoing Assessment (BTS-P)' }],
      );
    }));

    const select = await screen.findByText(/iPD course name/i);
    await selectEvent.clearAll(select);
    expect(onChange).toHaveBeenCalled();
  });
});
