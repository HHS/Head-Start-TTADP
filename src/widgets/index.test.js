import widgets from './index';

describe('widgets index', () => {
  it('exports all widget functions', () => {
    expect(widgets.overview).toBeDefined();
    expect(typeof widgets.overview).toBe('function');

    expect(widgets.dashboardOverview).toBeDefined();
    expect(typeof widgets.dashboardOverview).toBe('function');

    expect(widgets.totalHrsAndRecipientGraph).toBeDefined();
    expect(typeof widgets.totalHrsAndRecipientGraph).toBe('function');

    expect(widgets.standardGoalsList).toBeDefined();
    expect(typeof widgets.standardGoalsList).toBe('function');

    expect(widgets.topicFrequencyGraph).toBeDefined();
    expect(typeof widgets.topicFrequencyGraph).toBe('function');

    expect(widgets.targetPopulationTable).toBeDefined();
    expect(typeof widgets.targetPopulationTable).toBe('function');

    expect(widgets.frequencyGraph).toBeDefined();
    expect(typeof widgets.frequencyGraph).toBe('function');

    expect(widgets.goalStatusByGoalName).toBeDefined();
    expect(typeof widgets.goalStatusByGoalName).toBe('function');

    expect(widgets.trOverview).toBeDefined();
    expect(typeof widgets.trOverview).toBe('function');

    expect(widgets.trStandardGoalList).toBeDefined();
    expect(typeof widgets.trStandardGoalList).toBe('function');

    expect(widgets.trSessionsByTopic).toBeDefined();
    expect(typeof widgets.trSessionsByTopic).toBe('function');

    expect(widgets.trHoursOfTrainingByNationalCenter).toBeDefined();
    expect(typeof widgets.trHoursOfTrainingByNationalCenter).toBe('function');
  });

  it('exports the correct number of widgets', () => {
    const widgetKeys = Object.keys(widgets);
    expect(widgetKeys.length).toBeGreaterThan(1);
  });
});
