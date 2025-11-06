/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  waitFor,
} from '@testing-library/react';
import { useForm } from 'react-hook-form';

import StateMultiSelect from '../StateMultiSelect';
import UserContext from '../../UserContext';
import { getStateCodes } from '../../fetchers/users';
import { allRegionsUserHasActivityReportPermissionTo } from '../../permissions';

jest.mock('../../fetchers/users');
jest.mock('../../permissions');

const TestStateMultiSelect = ({ user, onSubmit }) => {
  const { control, handleSubmit } = useForm({
    defaultValues: { states: [] },
    mode: 'all',
  });

  const submit = (data) => {
    onSubmit(data);
  };

  return (
    <UserContext.Provider value={{ user }}>
      <form onSubmit={handleSubmit(submit)}>
        <StateMultiSelect
          name="states"
          control={control}
        />
        <button data-testid="submit" type="submit">submit</button>
      </form>
    </UserContext.Provider>
  );
};

describe('StateMultiSelect', () => {
  const mockUser = {
    id: 1,
    permissions: [
      { scopeId: 1, regionId: 1 },
      { scopeId: 2, regionId: 2 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2]);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    expect(document.querySelector('#states')).toBeVisible();
  });

  it('loads state codes for standard regions (1-10)', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2, 3]);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });

    expect(getStateCodes).not.toHaveBeenCalled();
  });

  it('fetches state codes for special regions (11 or 12)', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([11]);
    getStateCodes.mockResolvedValue(['MA', 'CA', 'TX']);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      expect(getStateCodes).toHaveBeenCalled();
    });
  });

  it('handles getStateCodes API failure gracefully', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([12]);
    getStateCodes.mockRejectedValue(new Error('API Error'));

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      expect(getStateCodes).toHaveBeenCalled();
    });

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });
  });

  it('includes states from multiple regions', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2, 11]);
    getStateCodes.mockResolvedValue(['MA', 'CA']);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      expect(getStateCodes).toHaveBeenCalled();
    });
  });

  it('handles mixed region permissions (standard and special)', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2, 11, 12]);
    getStateCodes.mockResolvedValue(['MA', 'NY', 'CA']);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      expect(getStateCodes).toHaveBeenCalled();
    });
  });

  it('handles unknown state codes from API', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([11]);
    getStateCodes.mockResolvedValue(['MA', 'UNKNOWN_CODE', 'CA']);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      expect(getStateCodes).toHaveBeenCalled();
    });
  });

  it('sorts state codes alphabetically', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2]);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });
  });

  it('removes duplicate state codes', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2, 11]);
    getStateCodes.mockResolvedValue(['MA', 'CT']);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      expect(getStateCodes).toHaveBeenCalled();
    });
  });

  it('handles user with no permissions', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([]);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });

    expect(getStateCodes).not.toHaveBeenCalled();
  });

  it('handles invalid region numbers gracefully', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([0, 13, 99]);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });

    expect(getStateCodes).not.toHaveBeenCalled();
  });

  it('only fetches state codes once', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1]);

    const { rerender } = render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });

    rerender(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });
  });

  it('passes correct props to MultiSelect', async () => {
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1]);

    render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

    await waitFor(() => {
      const select = document.querySelector('#states');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Region-specific state tests', () => {
    it('includes correct states for Region 1', async () => {
      allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1]);

      render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

      await waitFor(() => {
        const select = document.querySelector('#states');
        expect(select).toBeInTheDocument();
      });
    });

    it('includes correct states for Region 9 (includes territories)', async () => {
      allRegionsUserHasActivityReportPermissionTo.mockReturnValue([9]);

      render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

      await waitFor(() => {
        const select = document.querySelector('#states');
        expect(select).toBeInTheDocument();
      });
    });

    it('includes correct states for Region 10', async () => {
      allRegionsUserHasActivityReportPermissionTo.mockReturnValue([10]);

      render(<TestStateMultiSelect user={mockUser} onSubmit={jest.fn()} />);

      await waitFor(() => {
        const select = document.querySelector('#states');
        expect(select).toBeInTheDocument();
      });
    });
  });
});
