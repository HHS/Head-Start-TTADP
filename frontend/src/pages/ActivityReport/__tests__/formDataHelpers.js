import { REPORT_STATUSES, GOAL_STATUS } from '@ttahub/common';
import { convertGoalsToFormData, packageGoals } from '../formDataHelpers';

describe('FormDataHelpers', () => {
  describe('packageGoals', () => {
    const baseGoal = {
      objectives: [],
      goalIds: [1, 2, 3],
      onApprovedAR: true,
      status: GOAL_STATUS.IN_PROGRESS,
    };

    it('correctly formats goals with multiple recipients', () => {
      const grantIds = [1, 2];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            name: 'goal name',
            endDate: '09/01/2020',
            prompts: [{ fieldName: 'prompt' }],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          name: 'recipient',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [{ fieldName: 'prompt2' }],
      );
      /*
      console.log('packagedGoals123 all', packagedGoals);
      console.log('packagedGoals123', packagedGoals[0]);
      console.log('packagedGoals123', packagedGoals[0].prompts[0]);
*/
      expect(packagedGoals).toEqual([
        {
          ...baseGoal,
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
          grantIds,
          isActivelyBeingEditing: false,
          objectives: [],
        },
        {
          ...baseGoal,
          name: 'recipient',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          grantIds,
          prompts: [{ fieldName: 'prompt2' }],
          objectives: [],
        },
      ]);
    });

    it('correctly formats goals for a single recipient', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            name: 'goal name',
            endDate: '09/01/2020',
            prompts: [{ fieldName: 'prompt' }],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          name: 'recipient',
          objectives: [],
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
        },
        grantIds,
        [{ fieldName: 'prompt2' }],
      );

      expect(packagedGoals).toEqual([
        {
          ...baseGoal,
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
          grantIds,
          isActivelyBeingEditing: false,
        },
        {
          ...baseGoal,
          name: 'recipient',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          grantIds,
          prompts: [{ fieldName: 'prompt2' }],
        },
      ]);
    });
    it('skips returning edited goal if edited goal is null', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            name: 'goal name',
            endDate: '09/01/2020',
            prompts: [{ fieldName: 'prompt' }],
          },
        ],
        null,
        grantIds,
        [{ fieldName: 'prompt2' }],
      );

      expect(packagedGoals).toEqual([
        {
          ...baseGoal,
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
          grantIds,
          isActivelyBeingEditing: false,
        },
      ]);
    });
    it('skips returning edited goal if edited goal has no name', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            name: 'goal name',
            endDate: '09/01/2020',
            prompts: [{ fieldName: 'prompt' }],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          name: '',
          endDate: '',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [{ fieldName: 'prompt2' }],
      );

      expect(packagedGoals).toEqual([
        {
          ...baseGoal,
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
          grantIds,
          isActivelyBeingEditing: false,
          objectives: [],
        },
      ]);
    });

    it('correctly pacakges all objective fields', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            name: 'goal name',
            endDate: '09/01/2020',
            prompts: [{ fieldName: 'prompt' }],
            objectives: [
              {
                id: 1,
                isNew: false,
                ttaProvided: 'Not Created Here TTA',
                title: 'Not Created Here Title',
                status: 'status',
                resources: 'resources',
                topics: 'topics',
                files: 'files',
                supportType: 'supportType',
                courses: 'courses',
                closeSuspendReason: 'closeSuspendReason',
                closeSuspendContext: 'closeSuspendContext',
                createdHere: false,
              },
            ],
          },
        ],
        {
          ...baseGoal,
          name: 'recipient',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [
            {
              id: 2,
              isNew: false,
              ttaProvided: 'Created Here TTA',
              title: 'Created Here Title',
              status: 'status',
              resources: 'resources',
              topics: 'topics',
              files: 'files',
              supportType: 'supportType',
              courses: 'courses',
              closeSuspendReason: 'closeSuspendReason',
              closeSuspendContext: 'closeSuspendContext',
              createdHere: true,
            },
          ],
        },
        grantIds,
        [{ fieldName: 'prompt2' }],
      );

      expect(packagedGoals).toEqual([
        {
          ...baseGoal,
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
          grantIds,
          isActivelyBeingEditing: false,
          objectives: [
            {
              id: 1,
              isNew: false,
              ttaProvided: 'Not Created Here TTA',
              title: 'Not Created Here Title',
              status: 'status',
              resources: 'resources',
              topics: 'topics',
              files: 'files',
              supportType: 'supportType',
              courses: 'courses',
              closeSuspendReason: 'closeSuspendReason',
              closeSuspendContext: 'closeSuspendContext',
              createdHere: false,
            },
          ],
        },
        {
          ...baseGoal,
          name: 'recipient',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          grantIds,
          prompts: [{ fieldName: 'prompt2' }],
          objectives: [
            {
              id: 2,
              isNew: false,
              ttaProvided: 'Created Here TTA',
              title: 'Created Here Title',
              status: 'status',
              resources: 'resources',
              topics: 'topics',
              files: 'files',
              supportType: 'supportType',
              courses: 'courses',
              closeSuspendReason: 'closeSuspendReason',
              closeSuspendContext: 'closeSuspendContext',
              createdHere: true,
            },
          ],
        },
      ]);
    });
  });

  describe('convertGoalsToFormData', () => {
    it('converts', () => {
      const { goals, goalForEditing } = convertGoalsToFormData(
        [
          {
            id: 1,
            objectives: [],
            activityReportGoals: [
              {
                id: 1,
                isActivelyEdited: true,
              },
            ],
          },
          {
            id: 2,
            objectives: [],
            activityReportGoals: [
              {
                id: 2,
                isActivelyEdited: false,
              },
            ],
          },
        ],
        [1, 2, 3],
        REPORT_STATUSES.DRAFT,
      );

      expect(goals).toEqual([
        {
          id: 2,
          grantIds: [1, 2, 3],
          prompts: [],
          objectives: [],
          activityReportGoals: [
            { id: 2, isActivelyEdited: false },
          ],
        },
      ]);

      expect(goalForEditing).toEqual({
        id: 1,
        prompts: [],
        grantIds: [1, 2, 3],
        objectives: [],
        activityReportGoals: [
          { id: 1, isActivelyEdited: true },
        ],
      });
    });
    it('only returns one goalForEditing (even if more than one activityreportgoal has isActivelyEditing: true', () => {
      const { goals, goalForEditing } = convertGoalsToFormData(
        [
          {
            id: 1,
            activityReportGoals: [
              {
                id: 1,
                isActivelyEdited: true,
              },
            ],
            prompts: [],
          },
          {
            id: 2,
            activityReportGoals: [
              {
                id: 3,
                isActivelyEdited: true,
              },
            ],
            prompts: [],
          },
        ],
        [1, 2, 3],
        REPORT_STATUSES.DRAFT,
      );

      expect(goals).toEqual([
        {
          id: 2,
          grantIds: [1, 2, 3],
          activityReportGoals: [
            {
              id: 3,
              isActivelyEdited: true,
            },
          ],
          prompts: [],
        },
      ]);

      expect(goalForEditing).toEqual({
        id: 1,
        grantIds: [1, 2, 3],
        activityReportGoals: [
          {
            id: 1,
            isActivelyEdited: true,
          },
        ],
        prompts: [],
      });
    });
    it('returns an empty goalForEditing if no activityreportgoal has isActivelyEditing: true', () => {
      const { goals, goalForEditing } = convertGoalsToFormData(
        [
          {
            id: 1,

            activityReportGoals: [
              {
                id: 1,
                isActivelyEdited: false,
              },
            ],
            prompts: [],
          },
          {
            id: 2,

            activityReportGoals: [
              {
                id: 3,
                isActivelyEdited: false,
              },
            ],
            prompts: [],
          },
        ],
        [1, 2, 3],
        REPORT_STATUSES.DRAFT,
      );

      expect(goals).toEqual([
        {
          id: 1,
          grantIds: [1, 2, 3],
          prompts: [],
          activityReportGoals: [
            {
              id: 1,
              isActivelyEdited: false,
            },
          ],
        },
        {
          id: 2,
          prompts: [],
          grantIds: [1, 2, 3],
          activityReportGoals: [
            {
              id: 3,
              isActivelyEdited: false,
            },
          ],
        },
      ]);

      expect(goalForEditing).toEqual(null);
    });
    it('returns an empty goalForEditing if activityreportgoal is not set', () => {
      const { goals, goalForEditing } = convertGoalsToFormData(
        [
          {
            id: 1,

          },
          {
            id: 2,

          },
        ],
        [1, 2, 3],
        REPORT_STATUSES.DRAFT,
      );

      expect(goals).toEqual([
        {
          id: 1,
          grantIds: [1, 2, 3],
          prompts: [],
        },
        {
          id: 2,
          grantIds: [1, 2, 3],
          prompts: [],
        },
      ]);

      expect(goalForEditing).toEqual(null);
    });
    it('returns an empty goalForEditing if the goal is submitted', () => {
      const { goals, goalForEditing } = convertGoalsToFormData(
        [
          {
            id: 1,
            activityReportGoals: [
              {
                id: 1,
                isActivelyEdited: true,
              },
            ],

          },
          {
            id: 2,
            activityReportGoals: [
              {
                id: 3,
                isActivelyEdited: true,
              },
            ],

          },
        ],
        [1, 2, 3],
        REPORT_STATUSES.SUBMITTED,
      );

      expect(goals).toEqual([
        {
          id: 1,
          grantIds: [1, 2, 3],
          activityReportGoals: [
            {
              id: 1,
              isActivelyEdited: true,
            },
          ],
          prompts: [],
        },
        {
          id: 2,
          grantIds: [1, 2, 3],
          activityReportGoals: [
            {
              id: 3,
              isActivelyEdited: true,
            },
          ],
          prompts: [],
        },
      ]);

      expect(goalForEditing).toEqual(null);
    });
  });
});
