import { REPORT_STATUSES } from '@ttahub/common';
import { convertGoalsToFormData } from '../formDataHelpers';

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
          source: 'Source',
        },
        {
          id: 2,
          objectives: [],
          source: '',
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
        source: '',
        prompts: [],
        objectives: [],
        activityReportGoals: [
          { id: 2, isActivelyEdited: false },
        ],
      },
    ]);

    expect(goalForEditing).toEqual({
      id: 1,
      source: '',
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
        source: '',
        prompts: [],
      },
    ]);

    expect(goalForEditing).toEqual({
      id: 1,
      grantIds: [1, 2, 3],
      source: '',
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
        source: '',
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
        source: '',
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
        source: '',
        prompts: [],
      },
      {
        id: 2,
        grantIds: [1, 2, 3],
        source: '',
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
        source: '',
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
        source: '',
        prompts: [],
      },
    ]);

    expect(goalForEditing).toEqual(null);
  });
});
