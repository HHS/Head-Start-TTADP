import {
  monitoringDiagnostics,
  monitoringDiagnosticById,
} from '../../services/monitoringDiagnostics';
import { auditLogger as logger } from '../../logger';

const namespace = 'SERVICE:MONITORING_DIAGNOSTICS';

export function getMonitoringDiagnostics(resource) {
  return async (req, res) => {
    try {
      const diagnostics = await monitoringDiagnostics(resource, req.query);

      if (!diagnostics) {
        res.sendStatus(404);
        return;
      }

      res.header('Content-Range', `${resource} */${diagnostics.count}`);
      res.json(diagnostics.rows);
    } catch (error) {
      logger.error(`${namespace}:${resource} - Sequelize error - unable to get from db - ${error}`);
    }
  };
}

export function getMonitoringDiagnostic(resource) {
  return async (req, res) => {
    try {
      const { id } = req.params;
      const diagnostic = await monitoringDiagnosticById(resource, id);

      if (!diagnostic) {
        res.sendStatus(404);
        return;
      }

      res.json(diagnostic);
    } catch (error) {
      logger.error(`${namespace}:${resource} - Sequelize error - unable to get from db - ${error}`);
    }
  };
}
