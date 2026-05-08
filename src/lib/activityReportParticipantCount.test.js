import { getActivityReportParticipantCount } from './activityReportParticipantCount';

describe('getActivityReportParticipantCount', () => {
  it('uses the legacy participant field for non-hybrid reports', () => {
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'in-person',
        numberOfParticipants: 8,
      })
    ).toBe(8);
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'virtual',
        numberOfParticipants: 6,
      })
    ).toBe(6);
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: null,
        numberOfParticipants: 4,
      })
    ).toBe(4);
  });

  it('sums hybrid in-person and virtual participant counts', () => {
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'hybrid',
        numberOfParticipants: null,
        numberOfParticipantsInPerson: 5,
        numberOfParticipantsVirtually: 7,
      })
    ).toBe(12);
  });

  it('falls back to the legacy participant field for older hybrid reports', () => {
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'hybrid',
        numberOfParticipants: 9,
        numberOfParticipantsInPerson: null,
        numberOfParticipantsVirtually: null,
      })
    ).toBe(9);
  });

  it('falls back to the legacy participant field when hybrid breakdown data is partial', () => {
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'hybrid',
        numberOfParticipants: 10,
        numberOfParticipantsInPerson: 4,
        numberOfParticipantsVirtually: null,
      })
    ).toBe(10);
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'hybrid',
        numberOfParticipants: 12,
        numberOfParticipantsInPerson: null,
        numberOfParticipantsVirtually: 5,
      })
    ).toBe(12);
  });

  it('uses the available hybrid participant counts when the legacy total is missing', () => {
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'hybrid',
        numberOfParticipants: null,
        numberOfParticipantsInPerson: 4,
        numberOfParticipantsVirtually: null,
      })
    ).toBe(4);
    expect(
      getActivityReportParticipantCount({
        deliveryMethod: 'hybrid',
        numberOfParticipants: null,
        numberOfParticipantsInPerson: null,
        numberOfParticipantsVirtually: 3,
      })
    ).toBe(3);
  });
});
