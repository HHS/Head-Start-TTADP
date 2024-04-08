import { Op, WhereOptions } from 'sequelize';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import {
  formatNumber,
  getAllRecipientsFiltered,
} from './helpers';

const {
  EventReportPilot: TrainingReport,
  SessionReportPilot: SessionReport,
  Recipient,
  Grant,
} = db;

/**
 * interface for scopes
 */

interface IScopes {
  grant: WhereOptions[],
  trainingReport: WhereOptions[],
}

/**
 * Interface for the data returned by the Training Report findAll
 * we use to calculate the data for the TR Overview widget
 */
interface ITrainingReportForOverview {
  data: {
    status: string,
  }
  sessionReports: {
    data: {
      status: string,
      deliveryMethod: string,
      duration: number,
      recipients: {
        value: number,
      }[],
      numberOfParticipantsVirtually: number,
      numberOfParticipantsInPerson: number,
      numberOfParticipants: number,
    }
  }[]
}

/**
 * Interface for the accumulator object used as an interim
 * data structure to calculate the data for the TR Overview widget
 */
interface IReportData {
  numReports: string;
  totalRecipients: number;
  grantIds: number[];
  sumDuration: number;
  numParticipants: number;
}

/**
   * Interface for the data returned by the TR Overview widget
   */
interface IWidgetData {
  numReports: string;
  numGrants: string;
  numRecipients: string;
  totalRecipients: string;
  sumDuration: string;
  numParticipants: string;
  recipientPercentage: string;
}

/**
 * Function to calculate the data for the TR Overview widget
 * @param scopes
 * @returns IWidgetData
 */
export default async function trOverview(
  scopes: IScopes = { grant: [], trainingReport: [] },
): Promise<IWidgetData> {
  // get all recipients, matching how they are filtered in the AR overview
  const allRecipientsFiltered = await getAllRecipientsFiltered(scopes);

  // Get all completed training reports and their session reports
  const reports = await TrainingReport.findAll({
    attributes: ['data', 'id'],
    where: {
      [Op.and]: [
        {
          'data.status': TRAINING_REPORT_STATUSES.COMPLETE,
        },
        ...scopes.trainingReport,
      ],
    },
    include: {
      model: SessionReport,
      as: 'sessionReports',
      attributes: ['data', 'eventId'],
      required: true,
    },
  }) as ITrainingReportForOverview[];

  const data = reports.reduce((acc: IReportData, report) => {
    const { sessionReports } = report;

    let sessionGrants = [];
    let sessionDuration = 0;
    let sessionParticipants = 0;

    sessionReports.forEach((sessionReport) => {
      const { data: sessionData } = sessionReport;
      const {
        deliveryMethod,
        duration,
        recipients,
        numberOfParticipantsVirtually,
        numberOfParticipantsInPerson,
        numberOfParticipants,
      } = sessionData;

      sessionDuration += duration;
      sessionGrants = sessionGrants.concat(recipients.map((r: { value: number }) => r.value));

      if (deliveryMethod === 'hybrid') {
        sessionParticipants += numberOfParticipantsInPerson + numberOfParticipantsVirtually;
      } else {
        sessionParticipants += numberOfParticipants;
      }
    });

    return {
      ...acc,
      grantIds: acc.grantIds.concat(sessionGrants),
      sumDuration: acc.sumDuration + sessionDuration,
      numParticipants: acc.numParticipants + sessionParticipants,
    };
  }, {
    numReports: formatNumber(reports.length), // number of completed TRs
    totalRecipients: allRecipientsFiltered.length, // total number of recipients
    grantIds: [], // number of unique grants served
    sumDuration: 0, // total hours of TTA
    numParticipants: 0, // total number of participants
  } as IReportData);

  const uniqueGrants = new Set(data.grantIds);

  const recipientsOnTrs = await Recipient.findAll({
    attribute: ['id'],
    include: [{
      attributes: ['id', 'recipientId'],
      model: Grant,
      as: 'grants',
      where: {
        id: {
          [Op.in]: Array.from(uniqueGrants),
        },
      },
      required: true,
    }],
  });

  const numRecipients = recipientsOnTrs.length;
  const rawPercentage = (numRecipients / data.totalRecipients) * 100;
  const recipientPercentage = `${formatNumber(rawPercentage, 2)}%`;

  return {
    numReports: data.numReports,
    totalRecipients: allRecipientsFiltered.length.toString(),
    // "X% [number of recipients with TR] Recipients of [total active recipients]" for complete TRs,
    recipientPercentage,
    // Add widget for "X of of unique grants on completed TRs
    numGrants: formatNumber(uniqueGrants.size),
    // total recipients
    numRecipients: formatNumber(numRecipients),
    // Add widget for number of hours of TTA on completed TRs
    sumDuration: formatNumber(data.sumDuration),
    // Add widget for number of participants on completed TRs
    numParticipants: formatNumber(data.numParticipants),
  };
}
