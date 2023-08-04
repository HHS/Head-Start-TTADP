export {};
const {
  NationalCenter,
  ReportNationalCenter,
} = require('../../models');
const { auditLoger } = require('../../logger');

// TODO: this needs alot of work
const syncNationalCenters = async (
  report: { id: number, type: string, regionId: number },
) => {
  try {
  // in parallel:
  //    validate that the type is valid for the report type
  //    get current collaborators for this report having this type
  // filter to the positive, nuteral, and negative lists
  // in parallel:
  //    perform in insert/update/delete based on the sub lists
  //        if a sublist is empty, do not call the db at all for that sublist
  } catch (err) {
    auditLoger.error(err);
    throw err;
  }
};

const getNationalCenters = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
):Promise<object[]> => ReportNationalCenter.findAll({
  attributes: [
    // filter this down to whats needed.
  ],
  where: {
    reportId: report.id,
    ...(nationalCenterIds && { nationalCenterIds }),
  },
  include: [
    // fill out anything thats needed
  ],
});

const getNationalCenter = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterId: number,
):Promise<object[]> => getNationalCenters(report, [nationalCenterId]);

module.exports = {
  syncNationalCenters,
  getNationalCenters,
  getNationalCenter,
};
