import _ from 'lodash';
import { Op } from 'sequelize';
import { DECIMAL_BASE } from '@ttahub/common';
import db from '../models';
import { syncCRApprovers } from './collabReportApprovers';

const {
  CollabReport,
  CollabReportApprover,
  CollabReportSpecialist,
  User,
} = db;

// Helper function to create a report
async function create(report) {
  return CollabReport.create(report);
}

// Function to save and remove CR specialists
async function saveReportSpecialists(collabReportId, specialists) {
  // Make a handy lookup object for the findOrCreate that comes next
  const newSpecialists = specialists.map((c) => ({
    collabReportId,
    userId: c,
  }));

  // Create and/or delete CR specialists
  if (newSpecialists.length > 0) {
    await Promise.all(newSpecialists.map((where) => (
      CollabReportSpecialist.findOrCreate({ where })
    )));
    await CollabReportSpecialist.destroy(
      {
        where: {
          collabReportId,
          userId: {
            [Op.notIn]: specialists,
          },
        },
      },
    );
  } else {
    await CollabReportSpecialist.destroy({
      where: {
        collabReportId,
      },
    });
  }
}

// Helper function to update a report using the model's built-in update
async function update(newReport, oldReport) {
  const updatedReport = await oldReport.update(newReport, {
    fields: _.keys(newReport),
  });
  return updatedReport;
}

// Get a CR by its id
export async function collabReportById(crId) {
  const collabReportId = parseInt(crId, DECIMAL_BASE);

  const report = await CollabReport.findOne({
    where: {
      id: crId,
    },
    include: [
      {
        model: User,
        as: 'author',
      },
      {
        required: false,
        model: CollabReportSpecialist,
        separate: true,
        as: 'collabReportSpecialists',
        include: [
          {
            model: User,
            as: 'specialist',
          },
        ],
      },
      {
        model: CollabReportApprover,
        attributes: ['id', 'status', 'note'],
        as: 'approvers',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
          },
        ],
      },
    ],
  });

  return report;
}

// Service to handle creating and updating CRs
export async function createOrUpdateReport(newReport, oldReport) {
  let savedReport;

  // Determine whether to update or create
  if (oldReport) {
    savedReport = await update(newReport, oldReport);
  } else {
    savedReport = await create(newReport);
  }

  // If there are specialists, those need to be saved separately
  if (newReport.collabReportSpecialists) {
    const { id: reportId } = savedReport;
    const specialists = newReport.collabReportSpecialists.map(
      (c) => c.user.id,
    );
    await saveReportSpecialists(reportId, specialists);
  }

  // Sync the approvers, if an empty array they get removed
  if (newReport.approverUserIds) {
    await syncCRApprovers(savedReport.id, newReport.approverUserIds);
  }

  // Finally, fetch a new copy of the saved report from the DB
  // (to ensure everything saved correctly, I guess?)
  const report = await collabReportById(savedReport.id);

  return {
    ...report.dataValues,
  };
}

export function getReports() {
  const stubbedSqlData = [];
  const reports = stubbedSqlData;
  return Promise.resolve({
    count: reports.length,
    rows: reports,
  });
}
