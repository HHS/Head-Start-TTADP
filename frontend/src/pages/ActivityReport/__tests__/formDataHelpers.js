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

    it('inserts goal at original index when originalIndex is provided', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            id: 1,
            name: 'Goal A',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
          {
            ...baseGoal,
            id: 3,
            name: 'Goal C',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          id: 2,
          name: 'Goal B (being edited)',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [],
        1, // originalIndex - should be inserted between Goal A and Goal C
      );

      expect(packagedGoals).toHaveLength(3);
      expect(packagedGoals[0].name).toBe('Goal A');
      expect(packagedGoals[1].name).toBe('Goal B (being edited)');
      expect(packagedGoals[2].name).toBe('Goal C');
    });

    it('appends goal to end when originalIndex is null (new goal)', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            id: 1,
            name: 'Goal A',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
          {
            ...baseGoal,
            id: 2,
            name: 'Goal B',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          id: 3,
          name: 'New Goal',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [],
        null, // no originalIndex - should append to end
      );

      expect(packagedGoals).toHaveLength(3);
      expect(packagedGoals[0].name).toBe('Goal A');
      expect(packagedGoals[1].name).toBe('Goal B');
      expect(packagedGoals[2].name).toBe('New Goal');
    });

    it('inserts goal at beginning when originalIndex is 0', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            id: 2,
            name: 'Goal B',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
          {
            ...baseGoal,
            id: 3,
            name: 'Goal C',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          id: 1,
          name: 'Goal A (was first)',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [],
        0, // should be inserted at beginning
      );

      expect(packagedGoals).toHaveLength(3);
      expect(packagedGoals[0].name).toBe('Goal A (was first)');
      expect(packagedGoals[1].name).toBe('Goal B');
      expect(packagedGoals[2].name).toBe('Goal C');
    });

    it('appends goal when originalIndex exceeds array length', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            id: 1,
            name: 'Goal A',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          id: 2,
          name: 'Goal B',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [],
        999, // index beyond array length
      );

      expect(packagedGoals).toHaveLength(2);
      expect(packagedGoals[0].name).toBe('Goal A');
      expect(packagedGoals[1].name).toBe('Goal B');
    });

    it('includes goal id in packaged goal for goalOrder calculation', () => {
      const grantIds = [1];
      const packagedGoals = packageGoals(
        [
          {
            ...baseGoal,
            id: 2,
            name: 'Goal B',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
          {
            ...baseGoal,
            id: 3,
            name: 'Goal C',
            endDate: '09/01/2020',
            prompts: [],
            objectives: [],
          },
        ],
        {
          ...baseGoal,
          id: 1,
          name: 'Goal A (being edited)',
          endDate: '09/01/2020',
          isActivelyBeingEditing: true,
          objectives: [],
        },
        grantIds,
        [],
        0, // Insert at beginning
      );

      // Goal should be inserted at index 0 with its ID preserved
      expect(packagedGoals).toHaveLength(3);
      expect(packagedGoals[0].id).toBe(1);
      expect(packagedGoals[0].name).toBe('Goal A (being edited)');
      expect(packagedGoals[0].isActivelyBeingEditing).toBe(true);
      expect(packagedGoals[1].id).toBe(2);
      expect(packagedGoals[2].id).toBe(3);

      // Verify all goals have IDs for goalOrder calculation
      packagedGoals.forEach((goal) => {
        expect(goal.id).toBeDefined();
        expect(typeof goal.id).toBe('number');
      });
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
        originalIndex: 0,
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
        objectives: undefined,
        originalIndex: 0,
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

    it('uses goalOrder to sort goals and sets correct originalIndex for goalForEditing', () => {
      // Simulate backend returning goals in createdAt order (wrong order)
      const goalsFromBackend = [
        {
          id: 2,
          name: 'Goal B',
          activityReportGoals: [
            {
              id: 2,
              isActivelyEdited: false,
            },
          ],
          objectives: [],
          prompts: [],
        },
        {
          id: 3,
          name: 'Goal C',
          activityReportGoals: [
            {
              id: 3,
              isActivelyEdited: false,
            },
          ],
          objectives: [],
          prompts: [],
        },
        {
          id: 1,
          name: 'Goal A',
          activityReportGoals: [
            {
              id: 1,
              isActivelyEdited: true, // This goal is being edited
            },
          ],
          objectives: [],
          prompts: [],
        },
      ];

      // goalOrder specifies the correct order: Goal A should be first
      const goalOrder = [1, 2, 3];

      const { goals, goalForEditing } = convertGoalsToFormData(
        goalsFromBackend,
        [1, 2, 3],
        REPORT_STATUSES.DRAFT,
        goalOrder,
      );

      // goalForEditing should be Goal A with originalIndex 0 (first position)
      expect(goalForEditing).toBeDefined();
      expect(goalForEditing.id).toBe(1);
      expect(goalForEditing.name).toBe('Goal A');
      expect(goalForEditing.originalIndex).toBe(0);

      // goals should contain the other goals in order
      expect(goals).toHaveLength(2);
      expect(goals[0].id).toBe(2);
      expect(goals[0].name).toBe('Goal B');
      expect(goals[1].id).toBe(3);
      expect(goals[1].name).toBe('Goal C');
    });

    it('maintains goal order when editing middle goal', () => {
      const goalsFromBackend = [
        {
          id: 1,
          name: 'Goal A',
          activityReportGoals: [{ id: 1, isActivelyEdited: false }],
          objectives: [],
          prompts: [],
        },
        {
          id: 3,
          name: 'Goal C',
          activityReportGoals: [{ id: 3, isActivelyEdited: false }],
          objectives: [],
          prompts: [],
        },
        {
          id: 2,
          name: 'Goal B',
          activityReportGoals: [{ id: 2, isActivelyEdited: true }],
          objectives: [],
          prompts: [],
        },
      ];

      const goalOrder = [1, 2, 3]; // Correct order

      const { goals, goalForEditing } = convertGoalsToFormData(
        goalsFromBackend,
        [1, 2, 3],
        REPORT_STATUSES.DRAFT,
        goalOrder,
      );

      // Goal B is being edited and should have originalIndex 1 (middle position)
      expect(goalForEditing.id).toBe(2);
      expect(goalForEditing.originalIndex).toBe(1);

      // Other goals should be in correct order
      expect(goals[0].id).toBe(1);
      expect(goals[1].id).toBe(3);
    });
  });
});
