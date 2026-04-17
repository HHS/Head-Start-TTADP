import {
  monitoringDiagnostics,
  monitoringDiagnosticById,
} from '../../services/monitoringDiagnostics';

export function getMonitoringDiagnostics(resource) {
  return async (req, res) => {
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
  return async (req, res) => {
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
