import db from '../../models';
import { includeReportObjectiveFiles } from './reportObjectiveFile';
import { includeReportObjectiveResources } from './reportObjectiveResource';
import { includeReportObjectiveTopics } from './reportObjectiveTopic';
import { includeReportObjectiveTrainers } from './reportObjectiveTrainer';

const {
  ReportObjective,
} = db;

const syncReportObjectives = async () => {};// TODO: everything
const includeReportObjectives = () => ({
  model: ReportObjective,
  as: 'reportObjective',
  required: false,
  attributes: [],
  include: [
    includeReportObjectiveFiles(),
    includeReportObjectiveResources(),
    includeReportObjectiveTopics(),
    includeReportObjectiveTrainers(),
  ],
});
const getReportObjectives = async () => {};

export {
  syncReportObjectives,
  includeReportObjectives,
  getReportObjectives,
};
