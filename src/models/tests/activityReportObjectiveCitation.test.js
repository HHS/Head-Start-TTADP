import db, {
  Citation,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
} from '..';

describe('activityReportObjectiveCitation model', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  it('defines flattened per-reference columns and drops legacy virtuals', () => {
    const flattenedColumns = [
      'citationId',
      'findingId',
      'grantId',
      'grantNumber',
      'reviewName',
      'standardId',
      'findingType',
      'findingSource',
      'acro',
      'severity',
      'reportDeliveryDate',
      'monitoringFindingStatusName',
    ];

    flattenedColumns.forEach((column) => {
      expect(ActivityReportObjectiveCitation.rawAttributes[column]).toBeDefined();
      expect(ActivityReportObjectiveCitation.rawAttributes[column].allowNull).toBe(false);
    });

    expect(ActivityReportObjectiveCitation.rawAttributes.citationId.references).toEqual({
      model: 'Citations',
      key: 'id',
    });

    expect(ActivityReportObjectiveCitation.rawAttributes.monitoringReferences).toBeDefined();
    expect(ActivityReportObjectiveCitation.rawAttributes.findingIds).toBeUndefined();
    expect(ActivityReportObjectiveCitation.rawAttributes.reviewNames).toBeUndefined();
  });

  it('supports row-per-reference values with flattened columns only', () => {
    const row = ActivityReportObjectiveCitation.build({
      activityReportObjectiveId: 101,
      citationId: 202,
      citation: '1302.101(a)(1)',
      findingId: 'finding-abc',
      grantId: 303,
      grantNumber: '14CH1234',
      reviewName: 'Monitoring Review',
      standardId: 404,
      findingType: 'Deficiency',
      findingSource: 'Monitoring',
      acro: 'ACRO',
      severity: 2,
      reportDeliveryDate: '2024-01-01',
      monitoringFindingStatusName: 'Open',
    });

    expect(row.activityReportObjectiveId).toBe(101);
    expect(row.citationId).toBe(202);
    expect(row.findingId).toBe('finding-abc');
    expect(row.grantId).toBe(303);
    expect(row.grantNumber).toBe('14CH1234');
    expect(row.reviewName).toBe('Monitoring Review');
    expect(row.standardId).toBe(404);
    expect(row.findingType).toBe('Deficiency');
    expect(row.findingSource).toBe('Monitoring');
    expect(row.acro).toBe('ACRO');
    expect(row.severity).toBe(2);
    expect(row.reportDeliveryDate).toBe('2024-01-01');
    expect(row.monitoringFindingStatusName).toBe('Open');
  });

  it('wires ActivityReportObjective and Citation through ActivityReportObjectiveCitation', () => {
    const aroCitationAssociation = ActivityReportObjective.associations.citations;
    expect(aroCitationAssociation.target).toBe(Citation);
    expect(aroCitationAssociation.through.model.name).toBe('ActivityReportObjectiveCitation');

    const citationAroAssociation = Citation.associations.activityReportObjectives;
    expect(citationAroAssociation.target).toBe(ActivityReportObjective);
    expect(citationAroAssociation.through.model.name).toBe('ActivityReportObjectiveCitation');

    expect(
      ActivityReportObjective.associations.activityReportObjectiveCitations.target,
    ).toBe(ActivityReportObjectiveCitation);
    expect(
      Citation.associations.activityReportObjectiveCitations.target,
    ).toBe(ActivityReportObjectiveCitation);
    expect(
      ActivityReportObjectiveCitation.associations.citationModel.target,
    ).toBe(Citation);
  });
});
