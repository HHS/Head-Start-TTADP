import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { TRAINING_EVENT_ORGANIZER } from '../../Constants';
import UserContext from '../../UserContext';
import useEventAndSessionStaff from '../useEventAndSessionStaff';
import useSessionApprovers from '../useSessionApprovers';

jest.mock('../useEventAndSessionStaff');

// Mock user for context
const mockUser = {
  id: 999,
  name: 'Current User',
  roles: [{ name: 'TTAC' }],
};

const mockOtherUser = {
  id: 1,
  name: 'Other User',
  roles: [{ name: 'ECM' }],
};

const mockApprover1 = {
  id: 2,
  name: 'Approver 1',
  roles: [{ name: 'GSM' }],
};

const mockApprover2 = {
  id: 3,
  name: 'Approver 2',
  roles: [{ name: 'TTAC' }],
};

const mockApprover3 = {
  id: 4,
  name: 'Approver 3',
  roles: [{ name: 'AA' }],
};

const mockEventOwner = {
  id: 100,
  name: 'Event Owner',
  roles: [{ name: 'ECM' }],
};

// Regional trainer group structure
const mockRegionalTrainersGroup = {
  label: 'Regional trainers',
  options: [mockApprover1, mockApprover2],
};

const mockNationalTrainersGroup = {
  label: 'National Center trainers',
  options: [mockOtherUser],
};

// Wrapper component to provide form and user context
const createWrapper =
  (facilitation = null, user = mockUser) =>
  ({ children }) => {
    const methods = useForm({
      defaultValues: {
        facilitation,
        event: null,
      },
    });
    return (
      <UserContext.Provider value={{ user }}>
        <FormProvider {...methods}>{children}</FormProvider>
      </UserContext.Provider>
    );
  };

describe('useSessionApprovers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEventAndSessionStaff as jest.Mock).mockReturnValue({
      trainerOptions: [mockApprover1, mockApprover2],
    });
  });

  describe('Basic Functionality', () => {
    it('returns approvers when no event organizer is set', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return null;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should filter out current user
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
    });

    it('returns empty array when no approvers are available', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return null;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('Event Organizer: REGIONAL_TTA_NO_NATIONAL_CENTERS', () => {
    it('filters approvers to only those with manager roles', () => {
      const approversWithRoles = [
        mockApprover1, // GSM - manager role
        mockApprover2, // TTAC - manager role
        mockApprover3, // AA - not a manager role
      ];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithRoles,
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should only include manager roles
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
      expect(result.current).not.toContain(mockApprover3);
    });

    it('filters out current user from manager role approvers', () => {
      const approversWithRoles = [
        mockUser, // Current user - should be filtered
        mockApprover1, // GSM - manager role
        mockApprover2, // TTAC - manager role
      ];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithRoles,
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Current user should be filtered out
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
      expect(result.current).not.toContain(mockUser);
    });
  });

  describe('Event Organizer: REGIONAL_PD_WITH_NATIONAL_CENTERS with facilitation=both', () => {
    it('filters to regional trainers with manager roles', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockRegionalTrainersGroup, mockNationalTrainersGroup],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper('both');
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return 'both';
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should only include regional trainers with manager roles
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
      expect(result.current).not.toContain(mockOtherUser);
    });

    it('flattens regional trainer options correctly', () => {
      const regionalTrainerWithManager = {
        id: 5,
        name: 'Regional Manager',
        roles: [{ name: 'ECM' }],
      };

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [
          {
            label: 'Regional trainers',
            options: [mockApprover1, regionalTrainerWithManager],
          },
          mockNationalTrainersGroup,
        ],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper('both');
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return 'both';
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should flatten regional trainers
      expect(result.current).toContain(mockApprover1);
      expect(result.current).toContain(regionalTrainerWithManager);
    });
  });

  describe('Event Organizer: REGIONAL_PD_WITH_NATIONAL_CENTERS with facilitation=regional_tta_staff', () => {
    it('filters to regional trainers with manager roles', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockRegionalTrainersGroup, mockNationalTrainersGroup],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper('regional_tta_staff');
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return 'regional_tta_staff';
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should only include regional trainers with manager roles
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
    });
  });

  describe('Event Organizer: REGIONAL_PD_WITH_NATIONAL_CENTERS with facilitation=national_center', () => {
    it('flattens grouped approvers before filtering current user and event owner', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [
          {
            label: 'Regional trainers',
            options: [mockUser, mockEventOwner, mockApprover1, mockApprover2],
          },
        ],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
        },
        ownerId: mockEventOwner.id,
        regionId: 1,
      };

      const wrapper = createWrapper('national_center');
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return 'national_center';
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      expect(result.current).toEqual([mockApprover1, mockApprover2]);
      expect(result.current).not.toContain(mockUser);
      expect(result.current).not.toContain(mockEventOwner);
    });
  });

  describe('Admin User Handling', () => {
    it('does not filter out current user when isAdmin is true', () => {
      const adminUser = {
        id: 999,
        name: 'Admin User',
        roles: [{ name: 'ECM' }],
      };

      const approversWithRoles = [
        adminUser, // Current admin user
        mockApprover1,
        mockApprover2,
      ];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithRoles,
      });

      const wrapper = createWrapper(null, adminUser);
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return null;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: true,
          }),
        { wrapper }
      );

      // Admin user should be included
      expect(result.current).toContain(adminUser);
      expect(result.current).toEqual([adminUser, mockApprover1, mockApprover2]);
    });

    it('filters out current user when isAdmin is false', () => {
      const approversWithRoles = [mockUser, mockApprover1, mockApprover2];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithRoles,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return null;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Current user should be filtered out
      expect(result.current).not.toContain(mockUser);
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
    });
  });

  describe('Event Owner Filtering', () => {
    it('filters out the event owner from approver list', () => {
      const approversWithOwner = [
        mockEventOwner, // Event owner
        mockApprover1,
        mockApprover2,
      ];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithOwner,
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        ownerId: 100,
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Event owner should be filtered out
      expect(result.current).not.toContain(mockEventOwner);
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
    });

    it('handles case where event owner is not in approver list', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockApprover1, mockApprover2],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        ownerId: 999,
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should still return all approvers
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
    });

    it('does not filter event owner when ownerId is undefined', () => {
      const approversWithOwner = [mockEventOwner, mockApprover1, mockApprover2];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithOwner,
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Event owner should not be filtered (no ownerId)
      expect(result.current).toContain(mockEventOwner);
      expect(result.current).toEqual(approversWithOwner);
    });
  });

  describe('Combined Filters', () => {
    it('applies multiple filters together', () => {
      const approversWithAllTypes = [
        mockUser, // Current user - should be filtered
        mockEventOwner, // Event owner - should be filtered
        mockApprover1, // Should be kept (ECM role)
        mockApprover2, // Should be kept (TTAC role)
        mockApprover3, // Should be filtered (AA role - not manager)
      ];

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: approversWithAllTypes,
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        ownerId: mockEventOwner.id,
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Only manager role approvers should remain (not current user or owner)
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
      expect(result.current).not.toContain(mockUser);
      expect(result.current).not.toContain(mockEventOwner);
      expect(result.current).not.toContain(mockApprover3);
    });

    it('returns empty array when all approvers are filtered out', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockUser, mockEventOwner, mockApprover3],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        ownerId: mockEventOwner.id,
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // All approvers filtered out
      expect(result.current).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined event data gracefully', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockApprover1, mockApprover2],
      });

      const event = {
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should return all approvers minus current user
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
    });

    it('handles multiple users with the same role', () => {
      const approverWithECM1 = {
        id: 10,
        name: 'ECM User 1',
        roles: [{ name: 'ECM' }],
      };

      const approverWithECM2 = {
        id: 11,
        name: 'ECM User 2',
        roles: [{ name: 'ECM' }],
      };

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [approverWithECM1, approverWithECM2, mockApprover3],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Both ECM users should be included, AA user filtered
      expect(result.current).toEqual([approverWithECM1, approverWithECM2]);
      expect(result.current).not.toContain(mockApprover3);
    });

    it('handles users with multiple roles where one is a manager role', () => {
      const userWithMultipleRoles = {
        id: 12,
        name: 'Multi-role User',
        roles: [{ name: 'AA' }, { name: 'GSM' }],
      };

      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [userWithMultipleRoles],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // User should be included because one of their roles is a manager role
      expect(result.current).toContain(userWithMultipleRoles);
    });
  });

  describe('Event Organizer Data Structure Variants', () => {
    it('extracts eventOrganizer from event.data when present', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockApprover1, mockApprover2, mockApprover3],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        eventOrganizer: 'different-value',
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      // Should use event.data.eventOrganizer, filtering to manager roles
      expect(result.current).toEqual([mockApprover1, mockApprover2]);
      expect(result.current).not.toContain(mockApprover3);
    });
  });

  describe('Memoization', () => {
    it('returns the same reference when inputs do not change', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockApprover1, mockApprover2],
      });

      const event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        ownerId: 100,
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // Should be the same reference due to memoization
      expect(firstResult).toBe(secondResult);
    });

    it('returns a different reference when event changes', () => {
      (useEventAndSessionStaff as jest.Mock).mockReturnValue({
        trainerOptions: [mockApprover1, mockApprover2],
      });

      let event = {
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
        ownerId: 100,
        regionId: 1,
      };

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        () =>
          useSessionApprovers({
            watch: (field) => {
              if (field === 'event') return event;
              if (field === 'facilitation') return null;
              return null;
            },
            isAdmin: false,
          }),
        { wrapper }
      );

      const firstResult = result.current;

      // Change event
      event = {
        ...event,
        ownerId: 200,
      };

      rerender();
      const secondResult = result.current;

      // Should be a different reference
      expect(firstResult).not.toBe(secondResult);
    });
  });
});
