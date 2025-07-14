import type { Request, Response } from 'express';
import { getCollaborationReports } from '../../services/collaborationReports';

export async function getCollaborationReportsHandler(req: Request, res: Response) {
  const reportPayload = await getCollaborationReports();
  if (!reportPayload) {
    res.sendStatus(404);
  } else {
    res.json(reportPayload);
  }
}

export async function getCollaborationReportByIdHandler(req: Request, res: Response) {
  const reportId = req.params.id;
  const reportPayload = (await getCollaborationReports())?.rows.find((r) => r.id === reportId);
  if (!reportPayload) {
    res.sendStatus(404);
  } else {
    res.json(reportPayload);
  }
}
