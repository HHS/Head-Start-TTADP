const { updateSequence } = require('../lib/migration')

const reviews = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    contentId: '653DABA6-DE64-4081-B5B3-9A126487E8FF',
    statusId: 6006,
    startDate: new Date('2022/12/19'),
    endDate: new Date('2022/12/21'),
    reviewType: 'FA-1',
    reportDeliveryDate: new Date('2025/02/22'),
    outcome: 'Compliant',
    hash: 'seedhashrev1',
    sourceCreatedAt: new Date('2022/12/19'),
    sourceUpdatedAt: new Date('2023/02/23'),
    sourceDeletedAt: null,
    createdAt: new Date('2022/12/20'),
    updatedAt: new Date('2023/02/24'),
    deletedAt: null,
  },
  {
    id: 2,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    contentId: '653DABA6-DE64-4081-B5B3-9A126487E8FF',
    statusId: 6006,
    startDate: new Date('2022/12/08'),
    endDate: new Date('2022/12/08'),
    reviewType: 'RAN',
    reportDeliveryDate: new Date('2025/01/22'),
    outcome: 'Deficient',
    hash: 'seedhashrev2',
    sourceCreatedAt: new Date('2022/12/08'),
    sourceUpdatedAt: new Date('2023/01/14'),
    sourceDeletedAt: null,
    createdAt: new Date('2022/12/09'),
    updatedAt: new Date('2023/01/15'),
    deletedAt: null,
    name: 'REVIEW!!!',
  },
]

const reviewStatuses = [
  {
    id: 1,
    statusId: 6006,
    name: 'Complete',
    sourceCreatedAt: new Date('2020/01/01'),
    sourceUpdatedAt: new Date('2020/01/01'),
    sourceDeletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 2,
    statusId: 6007,
    name: 'Cancelled',
    sourceCreatedAt: new Date('2020/01/01'),
    sourceUpdatedAt: new Date('2020/01/01'),
    sourceDeletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
]

const reviewGrantees = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    granteeId: '36A0F1F6-0014-4111-BE4C-218BCC7ADF7B',
    createTime: new Date('2023/11/15'),
    updateTime: new Date('2023/11/15'),
    updateBy: 'Support Team',
    // Original data: 02HP000452
    // Links to Grant.id = 8
    grantNumber: '09CH033333',
    sourceCreatedAt: new Date('2023/11/15'),
    sourceUpdatedAt: new Date('2023/11/15'),
    sourceDeletedAt: null,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
  {
    id: 2,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    granteeId: '14FC5A81-8E27-4B06-A107-9C28762BC2F6',
    createTime: new Date('2023/11/15'),
    updateTime: new Date('2023/11/15'),
    updateBy: 'Support Team',
    // Original data: 90CI010025
    // Links to Grant.id = 9
    grantNumber: '09HP044444',
    sourceCreatedAt: new Date('2023/11/15'),
    sourceUpdatedAt: new Date('2023/11/15'),
    sourceDeletedAt: null,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
]

const reviewFindingHistories = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    findingHistoryId: '71528277-5F27-45B9-BDC2-28B5E797B51D',
    hash: 'seedhashfindhist1',
    sourceCreatedAt: new Date('2022/12/19'),
    sourceUpdatedAt: new Date('2023/02/23'),
    sourceDeletedAt: null,
    createdAt: new Date('2022/12/20'),
    updatedAt: new Date('2023/02/24'),
    deletedAt: null,
  },
  {
    id: 2,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    findingHistoryId: '59EF6676-51F6-48A7-9FD1-688BDFD9FDC6',
    hash: 'seedhashfindhist2',
    sourceCreatedAt: new Date('2022/12/08'),
    sourceUpdatedAt: new Date('2023/01/14'),
    sourceDeletedAt: null,
    createdAt: new Date('2022/12/09'),
    updatedAt: new Date('2023/01/15'),
    deletedAt: null,
  },
]

const reviewClassSummaries = [
  {
    id: 1,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    grantNumber: '09HP044444',
    // Values approximate originals
    emotionalSupport: 6.2303,
    classroomOrganization: 5.2303,
    instructionalSupport: 3.2303,
    reportDeliveryDate: new Date('2023/05/23'),
    hash: 'seedhashclasssum1',
    sourceCreatedAt: new Date('2023/05/23'),
    sourceUpdatedAt: new Date('2023/05/23'),
    sourceDeletedAt: null,
    createdAt: new Date('2023/05/24'),
    updatedAt: new Date('2023/05/24'),
    deletedAt: null,
  },
]

const grantNumberLinks = [
  {
    id: 1,
    grantNumber: '09CH033333',
    grantId: 8,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
  {
    id: 2,
    grantNumber: '09HP044444',
    grantId: 9,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
]

const monitoringReviewLinks = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    createdAt: new Date('2022/12/20'),
    updatedAt: new Date('2023/02/24'),
    deletedAt: null,
  },
  {
    id: 2,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    createdAt: new Date('2022/12/08'),
    updatedAt: new Date('2023/01/14'),
    deletedAt: null,
  },
]

const monitoringReviewStatusLinks = [
  {
    id: 1,
    statusId: 6006,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 2,
    statusId: 6007,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
]

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('GrantNumberLinks', grantNumberLinks)
    await queryInterface.bulkInsert(
      'MonitoringGranteeLinks',
      reviewGrantees.map(({ granteeId, createdAt, updatedAt, deletedAt }) => ({
        granteeId,
        createdAt,
        updatedAt,
        deletedAt,
      }))
    )
    await queryInterface.bulkInsert('MonitoringReviewLinks', monitoringReviewLinks)
    await queryInterface.bulkInsert('MonitoringReviewStatusLinks', monitoringReviewStatusLinks)
    await queryInterface.bulkInsert('MonitoringReviewStatuses', reviewStatuses)
    await queryInterface.bulkInsert('MonitoringReviews', reviews)
    await queryInterface.bulkInsert('MonitoringReviewGrantees', reviewGrantees)
    await queryInterface.bulkInsert('MonitoringFindingHistories', reviewFindingHistories)
    await queryInterface.bulkInsert('MonitoringClassSummaries', reviewClassSummaries)

    await updateSequence(queryInterface, 'GrantNumberLinks')
    await updateSequence(queryInterface, 'MonitoringGranteeLinks')
    await updateSequence(queryInterface, 'MonitoringReviewLinks')
    await updateSequence(queryInterface, 'MonitoringReviewStatusLinks')
    await updateSequence(queryInterface, 'MonitoringReviewStatuses')
    await updateSequence(queryInterface, 'MonitoringReviews')
    await updateSequence(queryInterface, 'MonitoringReviewGrantees')
    await updateSequence(queryInterface, 'MonitoringFindingHistories')
    await updateSequence(queryInterface, 'MonitoringClassSummaries')
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('MonitoringReviewGrantees', null)
    await queryInterface.bulkDelete('MonitoringReviews', null)
    await queryInterface.bulkDelete('MonitoringReviewStatuses', null)
    await queryInterface.bulkDelete('MonitoringFindingHistories', null)
    await queryInterface.bulkDelete('MonitoringClassSummaries', null)
    await queryInterface.bulkDelete('GrantNumberLinks', null)
    await queryInterface.bulkDelete('MonitoringReviewLinks', null)
    await queryInterface.bulkDelete('MonitoringReviewStatusLinks', null)
  },
}
