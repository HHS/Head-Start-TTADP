import { renderHook } from '@testing-library/react-hooks';
import { TRAINING_REPORT_STATUSES, REPORT_STATUSES } from '@ttahub/common/src/constants';
import React from 'react';
import UserContext from '../../UserContext';
import useSessionCardPermissions from '../useSessionCardPermissions';
import { TRAINING_EVENT_ORGANIZER } from '../../Constants';

const mockUser = {
  id: 1,
  permissions: [],
};

const mockAdminUser = {
  id: 2,
  permissions: [{ scopeId: 2 }], // ADMIN scope
};

const mockSessionApprover = {
  id: 3,
  permissions: [],
};

const wrapper = ({ children, user }) => (
  <UserContext.Provider value={{ user }}>
    {children}
  </UserContext.Provider>
);

describe('useSessionCardPermissions', () => {
  const baseSession = {
    approverId: 3,
    data: {
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      pocComplete: false,
      collabComplete: false,
      facilitation: 'national_centers',
    },
  };

  const baseProps = {
    session: baseSession,
    isPoc: false,
    isOwner: false,
    isCollaborator: false,
    isWriteable: true,
    eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
    eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
  };

  describe('submitted sessions', () => {
    it('returns false when session is submitted and user is not the approver', () => {
      const props = {
        ...baseProps,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            collabComplete: true,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when session is submitted and user is the approver', () => {
      const props = {
        ...baseProps,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            collabComplete: true,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockSessionApprover },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('returns true when session is submitted with NEEDS_ACTION status and user is POC', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            status: REPORT_STATUSES.NEEDS_ACTION,
            collabComplete: true,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('returns true when session is submitted with NEEDS_ACTION status and user is collaborator', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            status: REPORT_STATUSES.NEEDS_ACTION,
            collabComplete: true,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('returns false when session is submitted with NEEDS_ACTION status and user is approver', () => {
      const props = {
        ...baseProps,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            status: REPORT_STATUSES.NEEDS_ACTION,
            collabComplete: true,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockSessionApprover },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when admin and session is submitted with NEEDS_ACTION status', () => {
      const props = {
        ...baseProps,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            status: REPORT_STATUSES.NEEDS_ACTION,
            collabComplete: true,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });
  });

  describe('owner restrictions', () => {
    it('returns false when user is owner', () => {
      const props = {
        ...baseProps,
        isOwner: true,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });
  });

  describe('POC permissions', () => {
    it('returns false when POC and pocComplete is true for non-admin', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when POC and pocComplete is true for admin', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('returns false when POC and event organizer is Regional TTA No National Centers', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when POC with valid conditions', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });
  });

  describe('collaborator permissions', () => {
    it('returns false when collaborator and collabComplete is true for non-admin', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            collabComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when collaborator and collabComplete is true for admin', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            collabComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('returns false when collaborator, Regional PD with National Centers, and facilitation is regional_tta_staff', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            facilitation: 'regional_tta_staff',
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns false when collaborator, Regional PD with National Centers, and facilitation is both', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            facilitation: 'both',
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when collaborator with valid conditions', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            facilitation: 'national_centers',
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });
  });

  describe('general edit restrictions', () => {
    it('returns false when non-admin and isWriteable is false', () => {
      const props = {
        ...baseProps,
        isWriteable: false,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns false when non-admin and session status is Complete', () => {
      const props = {
        ...baseProps,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when admin and session status is Complete but event is not', () => {
      const props = {
        ...baseProps,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          },
        },
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });
  });

  describe('admin privileges', () => {
    it('returns false when admin and event status is Complete', () => {
      const props = {
        ...baseProps,
        eventStatus: TRAINING_REPORT_STATUSES.COMPLETE,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when admin and event status is not Complete', () => {
      const props = {
        ...baseProps,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('allows admin to edit when isWriteable is false', () => {
      const props = {
        ...baseProps,
        isWriteable: false,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });
  });

  describe('default case', () => {
    it('returns true when all checks pass for regular user', () => {
      const { result } = renderHook(() => useSessionCardPermissions(baseProps), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('handles POC who is also admin with pocComplete', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            pocComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('handles collaborator who is admin with collabComplete', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            collabComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockAdminUser },
      });

      expect(result.current.showSessionEdit).toBe(true);
    });

    it('prioritizes submitted check over other conditions', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            pocComplete: true,
            collabComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('prioritizes owner check over POC permissions', () => {
      const props = {
        ...baseProps,
        isPoc: true,
        isOwner: true,
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });
  });
});
