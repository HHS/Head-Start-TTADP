const reviews = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    contentId: '653DABA6-DE64-4081-B5B3-9A126487E8FF',
    statusId: 6006,
    startDate: new Date('2022/12/19'),
    endDate: new Date('2022/12/21'),
    reviewType: 'FA-1',
    reportDeliveryDate: new Date('2023/02/22'),
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
    reportDeliveryDate: new Date('2023/01/13'),
    outcome: 'Deficient',
    hash: 'seedhashrev2',
    sourceCreatedAt: new Date('2022/12/08'),
    sourceUpdatedAt: new Date('2023/01/14'),
    sourceDeletedAt: null,
    createdAt: new Date('2022/12/09'),
    updatedAt: new Date('2023/01/15'),
    deletedAt: null,
  },
];

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
];

const reviewGrantees = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    granteeId: '36A0F1F6-0014-4111-BE4C-218BCC7ADF7B',
    createTime: new Date('2023/11/15'),
    updateTime: new Date('2023/11/15'),
    updateBy: 'Support Team',
    // Original data: 02HP000452
    // Links to Grant.id = 3
    grantNumber: '14CH00001',
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
    // Links to Grant.id = 4
    grantNumber: '14CH00002',
    sourceCreatedAt: new Date('2023/11/15'),
    sourceUpdatedAt: new Date('2023/11/15'),
    sourceDeletedAt: null,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
];

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
];

const reviewClassSummaries = [
  {
    id: 1,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    grantNumber: '14CH00002',
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
];

const grantNumberLinks = [
  {
    grantNumber: '14CH00001',
    grantId: 3,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
  {
    grantNumber: '14CH00002',
    grantId: 4,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
];

const monitoringReviewLinks = [
  {
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    createdAt: new Date('2022/12/20'),
    updatedAt: new Date('2023/02/24'),
    deletedAt: null,
  },
  {
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    sourceCreatedAt: new Date('2022/12/08'),
    sourceUpdatedAt: new Date('2023/01/14'),
    deletedAt: null,
  },
];

const monitoringReviewStatusLinks = [
  {
    statusId: 6006,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('MonitoringReviewStatuses', reviewStatuses);
    await queryInterface.bulkInsert('MonitoringReviews', reviews);
    await queryInterface.bulkInsert('MonitoringReviewGrantees', reviewGrantees);
    await queryInterface.bulkInsert('MonitoringFindingHistories', reviewFindingHistories);
    await queryInterface.bulkInsert('MonitoringClassSummaries', reviewClassSummaries);
    await queryInterface.bulkInsert('GrantNumberLinks', grantNumberLinks);
    await queryInterface.bulkInsert('MonitoringReviewLinks', monitoringReviewLinks);
    await queryInterface.bulkInsert('MonitoringReviewStatusLinks', monitoringReviewStatusLinks);
  },
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('MonitoringReviewGrantees', null);
    await queryInterface.bulkDelete('MonitoringReviews', null);
    await queryInterface.bulkDelete('MonitoringReviewStatuses', null);
    await queryInterface.bulkDelete('MonitoringFindingHistories', null);
    await queryInterface.bulkDelete('MonitoringClassSummaries', null);
    await queryInterface.bulkDelete('GrantNumberLinks', null);
    await queryInterface.bulkDelete('MonitoringReviewLinks', null);
    await queryInterface.bulkDelete('MonitoringReviewStatusLinks', null);
  },
};
