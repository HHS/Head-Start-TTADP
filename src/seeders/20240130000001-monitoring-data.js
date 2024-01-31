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

const review_statuses = [
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

const review_grantees = [
  {
    id: 1,
    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
    granteeId: '36A0F1F6-0014-4111-BE4C-218BCC7ADF7B',
    createTime: new Date('2023/11/15'),
    updateTime: new Date('2023/11/15'),
    updateBy: 'Support Team',
    // Original data: 02HP000452
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
    grantNumber: '14CH00002',
    sourceCreatedAt: new Date('2023/11/15'),
    sourceUpdatedAt: new Date('2023/11/15'),
    sourceDeletedAt: null,
    createdAt: new Date('2023/11/16'),
    updatedAt: new Date('2023/11/16'),
    deletedAt: null,
  },
];

const review_finding_histories = [
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

const review_class_summaries = [
  {
    id: 1,
    reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    grantNumber: '14CH00002',
    emotionalSupport: 6.2303,
    classroomOrganization: 5.2303,
    instructionalSupport: 3.2303,
    reportDeliveryDate:  new Date('2023/05/23'),
    hash: 'seedhashclasssum1',
    sourceCreatedAt: new Date('2023/05/23'),
    sourceUpdatedAt: new Date('2023/05/23'),
    sourceDeletedAt: null,
    createdAt: new Date('2023/05/24'),
    updatedAt: new Date('2023/05/24'),
    deletedAt: null,
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('MonitoringReviewStatuses', review_statuses);
    await queryInterface.bulkInsert('MonitoringReviews', reviews);
    await queryInterface.bulkInsert('MonitoringReviewGrantees', review_grantees);
    await queryInterface.bulkInsert('MonitoringFindingHistories', review_finding_histories);
    await queryInterface.bulkInsert('MonitoringClassSummaries', approvers);
    // Probably unnecessary
    await queryInterface.sequelize.query(`ALTER SEQUENCE "MonitoringReviews_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "MonitoringReviewStatuses_id_seq" RESTART WITH ${recipients[recipients.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "MonitoringReviewGrantees_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "MonitoringFindingHistories_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "MonitoringClassSummaries_id_seq" RESTART WITH ${recipients[recipients.length - 1].id + 1};`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('MonitoringReviewGrantees', null);
    await queryInterface.bulkDelete('MonitoringReviews', null);
    await queryInterface.bulkDelete('MonitoringReviewStatuses', null);
    await queryInterface.bulkDelete('MonitoringFindingHistories', null);
    await queryInterface.bulkDelete('MonitoringClassSummaries', null);
  },
};
