import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '../../Constants';
import { mockWindowProperty } from '../../testHelpers';
import useDefaultFilters, { defaultDate } from '../useDefaultFilters';

describe('useDefaultFilters', () => {
  mockWindowProperty('sessionStorage', {
    getItem: jest.fn(() => JSON.stringify({})),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  });

  const mockUser = {
    homeRegionId: 14,
    permissions: [
      {
        regionId: 1,
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
      },
    ],
  };

  const renderTestComponent = (fn, user = mockUser) => {
    const TestComponent = () => {
      const { filters } = useDefaultFilters(user, 'testFilterKey');

      const onClick = () => {
        fn(filters);
      };

      return <button type="button" onClick={onClick}>Button</button>;
    };

    act(() => {
      render(<TestComponent />);
    });
  };

  it('returns the default filters', () => {
    const mocker = jest.fn();
    renderTestComponent(mocker);

    const button = screen.getByText('Button');
    act(() => {
      userEvent.click(button);
    });

    const filters = mocker.mock.calls[0][0];

    const topics = filters.map((filter) => filter.topic);
    const queries = filters.map((filter) => filter.query);
    const conditions = filters.map((filter) => filter.condition);

    expect(topics).toEqual(['region', 'startDate']);
    expect(queries).toEqual([1, defaultDate]);
    expect(conditions).toEqual(['is', 'is within']);
  });

  it('returns the default filters for a user who isn\'t central office', () => {
    const mocker = jest.fn();
    renderTestComponent(mocker, { ...mockUser, homeRegionId: 1 });

    const button = screen.getByText('Button');
    act(() => {
      userEvent.click(button);
    });

    const filters = mocker.mock.calls[0][0];

    const topics = filters.map((filter) => filter.topic);
    const queries = filters.map((filter) => filter.query);
    const conditions = filters.map((filter) => filter.condition);

    expect(topics).toEqual(['region', 'startDate']);
    expect(queries).toEqual([['1'], defaultDate]);
    expect(conditions).toEqual(['is', 'is within']);
  });
});
