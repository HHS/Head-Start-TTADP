import extractObjectiveAssociationsFromActivityReportObjectives from './extractObjectiveAssociationsFromActivityReportObjectives';
import { IActivityReportObjectivesModelInstance } from './types';

describe('extractObjectiveAssociationsFromActivityReportObjectives', () => {
  it('should extract associations and call toJSON on each association', () => {
    const mockToJson = jest.fn().mockReturnValue({ id: 1, name: 'Mocked Association' });

    const mockActivityReportObjective = {
      courses: [{ toJSON: mockToJson }],
    } as unknown as IActivityReportObjectivesModelInstance;

    const associations = extractObjectiveAssociationsFromActivityReportObjectives(
      [mockActivityReportObjective],
      'courses',
    );

    expect(associations).toEqual([{ id: 1, name: 'Mocked Association' }]);
    expect(mockToJson).toHaveBeenCalledTimes(1);
  });
});
