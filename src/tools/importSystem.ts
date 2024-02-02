import { download, process } from '../lib/importSystem';

export default async function manuallyTriggerImportSystem(action: string, importIdStr: string) {
  const importId = Number(importIdStr);
  if (!Number.isNaN(importId)) {
    switch (action) {
      case 'download':
        await download(importId);
        break;
      case 'process':
        await process(importId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
        break;
    }
  } else {
    throw new Error(`Bad or missing importId: ${importIdStr}`);
  }
}
