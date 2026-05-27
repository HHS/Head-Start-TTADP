import { once } from 'node:events';
import { auditLogger as logger } from '../../logger';
import {
  monitoringDiagnosticById,
  monitoringDiagnostics,
  monitoringDiagnosticsCsv,
} from '../../services/monitoringDiagnostics';

export function getMonitoringDiagnostics(resource) {
  return async function monitoringDiagnosticsHandler(req, res) {
    const diagnostics = await monitoringDiagnostics(resource, req.query);

    if (!diagnostics) {
      res.sendStatus(404);
      return;
    }

    res.header('Content-Range', `${resource} */${diagnostics.count}`);
    res.json(diagnostics.rows);
  };
}

export function getMonitoringDiagnostic(resource) {
  return async function monitoringDiagnosticHandler(req, res) {
    const { id: rawId } = req.params;
    if (!/^\d+$/.test(String(rawId))) {
      res.sendStatus(400);
      return;
    }

    const id = Number(rawId);
    const diagnostic = await monitoringDiagnosticById(resource, id);

    if (!diagnostic) {
      res.sendStatus(404);
      return;
    }

    res.json(diagnostic);
  };
}

export function exportMonitoringDiagnostics(resource) {
  return async function exportMonitoringDiagnosticsHandler(req, res) {
    const diagnosticsExportStream = await monitoringDiagnosticsCsv(resource, req.query);
    let responseStarted = false;

    try {
      res.writeHead(200, {
        'Content-Disposition': `attachment; filename="${resource}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
      });
      responseStarted = true;

      for await (const csvLine of diagnosticsExportStream) {
        if (!res.write(csvLine)) {
          await once(res, 'drain');
        }
      }

      res.end();
    } catch (err) {
      if (!responseStarted) {
        throw err;
      }
      logger.error(`exportMonitoringDiagnostics CSV stream failed after response started`, { err });
      res.destroy(err);
    }
  };
}
