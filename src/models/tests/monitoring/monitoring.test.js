import {
  GrantNumberLink,
  MonitoringClassSummary,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingHistory,
  MonitoringFindingHistoryStatus,
  MonitoringFindingHistoryStatusLink,
  MonitoringFindingLink,
  MonitoringFindingStandard,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  MonitoringGranteeLink,
  MonitoringReview,
  MonitoringReviewGrantee,
  MonitoringReviewLink,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  MonitoringStandard,
  MonitoringStandardLink,
} from '../..'

describe('MonitoringClassSummary Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringClassSummary.create({
      reviewId: 'Review123',
      grantNumber: 'Grant123',
      emotionalSupport: 3.7564,
      classroomOrganization: 4.0023,
      instructionalSupport: 2.9876,
      reportDeliveryDate: new Date(),
      hash: 'hash321',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.reviewId).toBe('Review123')
    expect(newRecord.grantNumber).toBe('Grant123')
    expect(newRecord.emotionalSupport).toBe('3.7564')
    expect(newRecord.classroomOrganization).toBe('4.0023')
    expect(newRecord.instructionalSupport).toBe('2.9876')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ emotionalSupport: 4.0 })

    // Fetch the updated record
    const updatedRecord = await MonitoringClassSummary.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.emotionalSupport).toBe('4.0000')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const reviewLink = await MonitoringReviewLink.findOne({ where: { reviewId: 'Review123' } })
    expect(reviewLink).not.toBe(null)

    const grantLink = await GrantNumberLink.findOne({ where: { grantNumber: 'Grant123' } })
    expect(grantLink).not.toBe(null)

    await MonitoringClassSummary.destroy({
      where: { grantNumber: 'Grant123', reviewId: 'Review123' },
      force: true,
    })
    await GrantNumberLink.destroy({ where: { grantNumber: 'Grant123' }, force: true })
    await MonitoringReviewLink.destroy({ where: { reviewId: 'Review123' }, force: true })
  })
})

describe('MonitoringFinding Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringFinding.create({
      findingId: '123',
      statusId: 1,
      findingType: 'Type A',
      source: 'Source A',
      correctionDeadLine: new Date(),
      reportedDate: new Date(),
      closedDate: new Date(),
      hash: 'abc123',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    })

    // Verify the inserted record
    expect(newRecord.findingId).toBe('123')
    expect(newRecord.statusId).toBe(1)
    expect(newRecord.findingType).toBe('Type A')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ findingType: 'Type B' })

    // Fetch the updated record
    const updatedRecord = await MonitoringFinding.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.findingType).toBe('Type B')
    // Add more expect statements for other fields if they were updated

    const statusLink = await MonitoringFindingStatusLink.findOne({ where: { statusId: 1 } })
    expect(statusLink).not.toBe(null)

    const findingLink = await MonitoringFindingLink.findOne({ where: { findingId: '123' } })
    expect(findingLink).not.toBe(null)

    await MonitoringFinding.destroy({
      where: { statusId: 1, findingId: '123' },
      force: true,
    })
    await MonitoringFindingStatusLink.destroy({ where: { statusId: 1 }, force: true })
    await MonitoringFindingLink.destroy({ where: { findingId: '123' }, force: true })
  })
})

describe('MonitoringFindingGrant Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringFindingGrant.create({
      findingId: 'F123',
      granteeId: 'G123',
      statusId: 2,
      findingType: 'Compliance',
      source: 'Internal Audit',
      correctionDeadLine: new Date(),
      reportedDate: new Date(),
      closedDate: new Date(),
      hash: 'uniquehash123',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.findingId).toBe('F123')
    expect(newRecord.granteeId).toBe('G123')
    expect(newRecord.statusId).toBe(2)
    expect(newRecord.findingType).toBe('Compliance')
    expect(newRecord.source).toBe('Internal Audit')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ findingType: 'Operational' })

    // Fetch the updated record
    const updatedRecord = await MonitoringFindingGrant.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.findingType).toBe('Operational')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const findingLink = await MonitoringFindingLink.findOne({ where: { findingId: 'F123' } })
    expect(findingLink).not.toBe(null)

    const statusLink = await MonitoringFindingStatusLink.findOne({ where: { statusId: 2 } })
    expect(statusLink).not.toBe(null)

    const granteeLink = await MonitoringGranteeLink.findOne({ where: { granteeId: 'G123' } })
    expect(granteeLink).not.toBe(null)

    await MonitoringFindingGrant.destroy({
      where: { statusId: 2, findingId: 'F123', granteeId: 'G123' },
      force: true,
    })
    await MonitoringFindingLink.destroy({ where: { findingId: 'F123' }, force: true })
    await MonitoringFindingStatusLink.destroy({ where: { statusId: 2 }, force: true })
    await MonitoringGranteeLink.destroy({ where: { granteeId: 'G123' }, force: true })
  })
})

describe('MonitoringFindingHistory Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringFindingHistory.create({
      reviewId: 'R123',
      findingHistoryId: 'FH123',
      findingId: 'F124',
      statusId: 1,
      narrative: 'Initial narrative',
      ordinal: 1,
      determination: 'Pending',
      hash: 'hash123',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.reviewId).toBe('R123')
    expect(newRecord.findingHistoryId).toBe('FH123')
    expect(newRecord.findingId).toBe('F124')
    expect(newRecord.statusId).toBe(1)
    expect(newRecord.narrative).toBe('Initial narrative')
    expect(newRecord.ordinal).toBe(1)
    expect(newRecord.determination).toBe('Pending')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ determination: 'Resolved' })

    // Fetch the updated record
    const updatedRecord = await MonitoringFindingHistory.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.determination).toBe('Resolved')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const reviewLink = await MonitoringReviewLink.findOne({ where: { reviewId: 'R123' } })
    expect(reviewLink).not.toBe(null)

    const findingLink = await MonitoringFindingLink.findOne({ where: { findingId: 'F124' } })
    expect(findingLink).not.toBe(null)

    const statusLink = await MonitoringFindingHistoryStatusLink.findOne({ where: { statusId: 1 } })
    expect(statusLink).not.toBe(null)

    await MonitoringFindingHistory.destroy({
      where: { statusId: 1, findingId: 'F124', reviewId: 'R123' },
      force: true,
    })
    await MonitoringReviewLink.destroy({ where: { reviewId: 'R123' }, force: true })
    await MonitoringFindingLink.destroy({ where: { findingId: 'F124' }, force: true })
    await MonitoringFindingHistoryStatusLink.destroy({ where: { statusId: 1 }, force: true })
  })
})

describe('MonitoringFindingHistoryStatus Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringFindingHistoryStatus.create({
      statusId: 2,
      name: 'Initial Review',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.statusId).toBe(2)
    expect(newRecord.name).toBe('Initial Review')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ name: 'Final Review' })

    // Fetch the updated record
    const updatedRecord = await MonitoringFindingHistoryStatus.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.name).toBe('Final Review')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const statusLink = await MonitoringFindingHistoryStatusLink.findOne({ where: { statusId: 2 } })
    expect(statusLink).not.toBe(null)

    await MonitoringFindingHistoryStatus.destroy({
      where: { statusId: 2 },
      force: true,
    })
    await MonitoringFindingHistoryStatusLink.destroy({ where: { statusId: 2 }, force: true })
  })
})

describe('MonitoringFindingStandard Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringFindingStandard.create({
      findingId: 'Finding001',
      standardId: 100,
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.findingId).toBe('Finding001')
    expect(newRecord.standardId).toBe(100)
    // Add more expect statements for other fields as needed

    // Update a field if necessary (for example, standardId)
    // Note: Example is to illustrate update, adjust based on actual use case
    await newRecord.update({ standardId: 101 })

    // Fetch the updated record
    const updatedRecord = await MonitoringFindingStandard.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.standardId).toBe(101)
    // Add more expect statements for other fields if they were updated

    // Check associations
    const standardLink = await MonitoringStandardLink.findOne({ where: { standardId: 101 } })
    expect(standardLink).not.toBe(null)

    const findingLink = await MonitoringFindingLink.findOne({ where: { findingId: 'Finding001' } })
    expect(findingLink).not.toBe(null)

    await MonitoringFindingStandard.destroy({
      where: { findingId: 'Finding001', standardId: 101 },
      force: true,
    })
    await MonitoringStandardLink.destroy({ where: { standardId: 101 }, force: true })
    await MonitoringStandardLink.destroy({ where: { standardId: 100 }, force: true })
    await MonitoringFindingLink.destroy({ where: { findingId: 'Finding001' }, force: true })
  })
})

describe('MonitoringFindingStatus Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringFindingStatus.create({
      statusId: 3,
      name: 'Pending Review',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.statusId).toBe(3)
    expect(newRecord.name).toBe('Pending Review')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ name: 'Review Complete' })

    // Fetch the updated record
    const updatedRecord = await MonitoringFindingStatus.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.name).toBe('Review Complete')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const statusLink = await MonitoringFindingStatusLink.findOne({ where: { statusId: 3 } })
    expect(statusLink).not.toBe(null)

    await MonitoringFindingStatus.destroy({
      where: { statusId: 3 },
      force: true,
    })
    await MonitoringFindingStatusLink.destroy({ where: { statusId: 3 }, force: true })
  })
})

describe('MonitoringReview Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringReview.create({
      reviewId: 'Review001',
      contentId: 'Content001',
      statusId: 1,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      reviewType: 'Annual',
      reportDeliveryDate: new Date('2024-02-01'),
      reportAttachmentId: 'Attachment001',
      outcome: 'Compliant',
      name: '1234Name',
      hash: 'uniquehash001',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.reviewId).toBe('Review001')
    expect(newRecord.contentId).toBe('Content001')
    expect(newRecord.statusId).toBe(1)
    expect(newRecord.reviewType).toBe('Annual')
    expect(newRecord.outcome).toBe('Compliant')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ outcome: 'Non-compliant' })

    // Fetch the updated record
    const updatedRecord = await MonitoringReview.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.outcome).toBe('Non-compliant')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const reviewLink = await MonitoringReviewLink.findOne({ where: { reviewId: 'Review001' } })
    expect(reviewLink).not.toBe(null)

    const statusLink = await MonitoringReviewStatusLink.findOne({ where: { statusId: 1 } })
    expect(statusLink).not.toBe(null)

    await MonitoringReview.destroy({
      where: { reviewId: 'Review001', statusId: 1 },
      force: true,
    })
    await MonitoringReviewLink.destroy({ where: { reviewId: 'Review001' }, force: true })
    await MonitoringReviewStatusLink.destroy({ where: { statusId: 1 }, force: true })
  })
})

describe('MonitoringReviewGrantee Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringReviewGrantee.create({
      reviewId: 'Review100',
      granteeId: 'Grantee100',
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'admin',
      grantNumber: 'Grant100',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.reviewId).toBe('Review100')
    expect(newRecord.granteeId).toBe('Grantee100')
    expect(newRecord.updateBy).toBe('admin')
    expect(newRecord.grantNumber).toBe('Grant100')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ updateBy: 'updatedAdmin' })

    // Fetch the updated record
    const updatedRecord = await MonitoringReviewGrantee.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.updateBy).toBe('updatedAdmin')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const reviewLink = await MonitoringReviewLink.findOne({ where: { reviewId: 'Review100' } })
    expect(reviewLink).not.toBe(null)

    const granteeLink = await MonitoringGranteeLink.findOne({ where: { granteeId: 'Grantee100' } })
    expect(granteeLink).not.toBe(null)

    const grantNumberLink = await GrantNumberLink.findOne({ where: { grantNumber: 'Grant100' } })
    expect(grantNumberLink).not.toBe(null)

    await MonitoringReviewGrantee.destroy({
      where: { grantNumber: 'Grant100', granteeId: 'Grantee100', reviewId: 'Review100' },
      force: true,
    })
    await MonitoringReviewLink.destroy({ where: { reviewId: 'Review100' }, force: true })
    await MonitoringGranteeLink.destroy({ where: { granteeId: 'Grantee100' }, force: true })
    await GrantNumberLink.destroy({ where: { grantNumber: 'Grant100' }, force: true })
  })
})

describe('MonitoringReviewStatus Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringReviewStatus.create({
      statusId: 2,
      name: 'In Progress',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.statusId).toBe(2)
    expect(newRecord.name).toBe('In Progress')
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ name: 'Completed' })

    // Fetch the updated record
    const updatedRecord = await MonitoringReviewStatus.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.name).toBe('Completed')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const statusLink = await MonitoringReviewStatusLink.findOne({ where: { statusId: 2 } })
    expect(statusLink).not.toBe(null)

    await MonitoringReviewStatus.destroy({
      where: { statusId: 2 },
      force: true,
    })
    await MonitoringReviewStatusLink.destroy({ where: { statusId: 2 }, force: true })
  })
})

describe('MonitoringStandard Model', () => {
  test('Insert and Update Record', async () => {
    // Insert a record
    const newRecord = await MonitoringStandard.create({
      standardId: 102,
      contentId: 'Content101',
      citation: 'Reference to relevant law or policy',
      text: 'Description of the standard',
      guidance: 'Guidance on how to comply',
      citable: 1,
      hash: 'uniquehash101',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    })

    // Verify the inserted record
    expect(newRecord.standardId).toBe(102)
    expect(newRecord.contentId).toBe('Content101')
    expect(newRecord.citation).toBe('Reference to relevant law or policy')
    expect(newRecord.text).toBe('Description of the standard')
    expect(newRecord.guidance).toBe('Guidance on how to comply')
    expect(newRecord.citable).toBe(1)
    // Add more expect statements for other fields as needed

    // Update a column in the record
    await newRecord.update({ text: 'Updated description of the standard' })

    // Fetch the updated record
    const updatedRecord = await MonitoringStandard.findByPk(newRecord.id)

    // Verify the updated record
    expect(updatedRecord.text).toBe('Updated description of the standard')
    // Add more expect statements for other fields if they were updated

    // Check associations
    const standardLink = await MonitoringStandardLink.findOne({ where: { standardId: 102 } })
    expect(standardLink).not.toBe(null)

    await MonitoringStandard.destroy({
      where: { standardId: 102 },
      force: true,
    })
    await MonitoringStandardLink.destroy({ where: { standardId: 102 }, force: true })
  })
})
