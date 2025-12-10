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
      ownerComplete: false,
      facilitation: 'national_centers',
    },
  };

  const baseProps = {
    session: baseSession,
    isPoc: false,
    isOwner: false,
    isCollaborator: false,
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
            ownerComplete: true,
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
            ownerComplete: true,
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
            ownerComplete: true,
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
            ownerComplete: true,
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
            ownerComplete: true,
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
            ownerComplete: true,
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
    it('returns false when collaborator and ownerComplete is true for non-admin', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            ownerComplete: true,
          },
        },
      };

      const { result } = renderHook(() => useSessionCardPermissions(props), {
        wrapper,
        initialProps: { user: mockUser },
      });

      expect(result.current.showSessionEdit).toBe(false);
    });

    it('returns true when collaborator and ownerComplete is true for admin', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            ownerComplete: true,
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

    it('handles collaborator who is admin with ownerComplete', () => {
      const props = {
        ...baseProps,
        isCollaborator: true,
        session: {
          ...baseSession,
          data: {
            ...baseSession.data,
            ownerComplete: true,
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
            ownerComplete: true,
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

  describe('delete permissions', () => {
    describe('owner delete permissions', () => {
      it('returns true for delete when owner and session in progress', () => {
        const props = {
          ...baseProps,
          isOwner: true,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns true for delete when owner and session is submitted', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              ownerComplete: true,
              pocComplete: true,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when owner and session is complete', () => {
        const props = {
          ...baseProps,
          isOwner: true,
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

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns false for delete when owner and event is complete', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          eventStatus: TRAINING_REPORT_STATUSES.COMPLETE,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(false);
      });
    });

    describe('approver delete permissions', () => {
      it('returns false for delete when approver-only and session submitted', () => {
        const props = {
          ...baseProps,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              ownerComplete: true,
              pocComplete: true,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockSessionApprover },
        });

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns false for delete when approver has edit permissions', () => {
        const props = {
          ...baseProps,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              ownerComplete: true,
              pocComplete: true,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockSessionApprover },
        });

        expect(result.current.showSessionEdit).toBe(true);
        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns true for delete when approver is also owner', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              ownerComplete: true,
              pocComplete: true,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockSessionApprover },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });
    });

    describe('POC delete permissions', () => {
      it('returns false for delete when POC with Regional TTA No National Centers', () => {
        const props = {
          ...baseProps,
          isPoc: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns false for delete when POC with Regional PD and National Centers facilitation', () => {
        const props = {
          ...baseProps,
          isPoc: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
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

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns true for delete when POC with Regional PD and Region facilitation', () => {
        const props = {
          ...baseProps,
          isPoc: true,
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

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns true for delete when POC and pocComplete is true (submission does not block delete)', () => {
        const props = {
          ...baseProps,
          isPoc: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              facilitation: 'regional_tta_staff',
              pocComplete: true,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when POC and session is complete', () => {
        const props = {
          ...baseProps,
          isPoc: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              facilitation: 'regional_tta_staff',
              status: TRAINING_REPORT_STATUSES.COMPLETE,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(false);
      });
    });

    describe('collaborator delete permissions', () => {
      it('returns true for delete when collaborator with Regional TTA organizer', () => {
        const props = {
          ...baseProps,
          isCollaborator: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns true for delete when collaborator with Regional PD and National Centers facilitation', () => {
        const props = {
          ...baseProps,
          isCollaborator: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
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

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when collaborator with Regional PD and Region facilitation', () => {
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

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns false for delete when collaborator with Regional PD and Both facilitation', () => {
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

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns true for delete when collaborator and ownerComplete is true (submission does not block delete)', () => {
        const props = {
          ...baseProps,
          isCollaborator: true,
          session: {
            ...baseSession,
            data: {
              ...baseSession.data,
              facilitation: 'national_centers',
              ownerComplete: true,
            },
          },
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when collaborator and session is complete', () => {
        const props = {
          ...baseProps,
          isCollaborator: true,
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

        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns false for delete when collaborator and event is complete', () => {
        const props = {
          ...baseProps,
          isCollaborator: true,
          eventStatus: TRAINING_REPORT_STATUSES.COMPLETE,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionDelete).toBe(false);
      });
    });

    describe('admin delete permissions', () => {
      it('returns true for delete when admin and event is not complete', () => {
        const props = {
          ...baseProps,
          eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockAdminUser },
        });

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns true for delete when admin and session is complete but event is not', () => {
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

        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when admin and event is complete', () => {
        const props = {
          ...baseProps,
          eventStatus: TRAINING_REPORT_STATUSES.COMPLETE,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockAdminUser },
        });

        expect(result.current.showSessionDelete).toBe(false);
      });
    });

    describe('multi-role delete scenarios', () => {
      it('returns true for delete when Owner+POC with Regional PD and Region facilitation', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          isPoc: true,
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
        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when Owner+POC with Regional TTA No National Centers', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          isPoc: true,
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionEdit).toBe(false);
        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns true for delete when Owner+Collaborator', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          isCollaborator: true,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockUser },
        });

        expect(result.current.showSessionEdit).toBe(false);
        expect(result.current.showSessionDelete).toBe(true);
      });

      it('returns false for delete when Owner+Collaborator with Regional PD and Region facilitation', () => {
        const props = {
          ...baseProps,
          isOwner: true,
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
        expect(result.current.showSessionDelete).toBe(false);
      });

      it('returns true for delete and false for edit when Approver+Owner', () => {
        const props = {
          ...baseProps,
          isOwner: true,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockSessionApprover },
        });

        expect(result.current.showSessionEdit).toBe(false);
        expect(result.current.showSessionDelete).toBe(true);
      });

      it('admin rules override all other roles', () => {
        const props = {
          ...baseProps,
          isOwner: true,
          isPoc: true,
          isCollaborator: true,
          eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        };

        const { result } = renderHook(() => useSessionCardPermissions(props), {
          wrapper,
          initialProps: { user: mockAdminUser },
        });

        expect(result.current.showSessionEdit).toBe(true);
        expect(result.current.showSessionDelete).toBe(true);
      });
    });
  });
});
