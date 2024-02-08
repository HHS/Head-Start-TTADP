import { download, process } from '../lib/importSystem';
import { auditLogger } from '../logger';

export default async function manuallyTriggerImportSystem(
  action: string,
  importIdStr: string,
  timeBoxStr: string,
) {
  try {
    if (!importIdStr || importIdStr.length === 0) throw new Error(`Bad or missing importId: '${importIdStr}'`);
    const importId = Number(importIdStr);
    const timeBox = timeBoxStr && timeBoxStr.length
      ? Number(timeBoxStr)
      : undefined;
    if (!Number.isNaN(importId)) {
      switch (action) {
        case 'download':
          await download(importId, timeBox);
          break;
        case 'process':
          await process(importId);
          break;
        default:
          throw new Error(`Unknown action: '${action}'`);
      }
    } else {
      throw new Error(`Bad or missing importId: '${importIdStr}'`);
    }
  } catch (e) {
    auditLogger.error(e.message);
    throw new Error(`Unknown error: '${e.message}'`);
  }
}
