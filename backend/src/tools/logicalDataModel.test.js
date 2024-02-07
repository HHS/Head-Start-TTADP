import fs from 'fs';
import logicalDataModel from './logicalDataModel';
import { auditLogger } from '../logger';

describe('logicalDataModel', () => {
  it('logicalDataModel', async () => {
    const encoded = [];
    const puml = [];

    const callBack = (err, stats, fileSet) => {
      if (stats != null) {
        fileSet.push(stats);
        return;
      }
      auditLogger.error(err);
      throw err;
    };

    const getStats = (path, target) => fs.stat(path, (err, stats) => callBack(err, stats, target));

    getStats('./docs/logical_data_model.encoded', encoded);
    getStats('./docs/logical_data_model.puml', puml);

    try {
      await logicalDataModel();
    } catch (err) {
      auditLogger.error(err);
      throw err;
    }

    getStats('./docs/logical_data_model.encoded', encoded);
    getStats('./docs/logical_data_model.puml', puml);

    expect(encoded[0]).not.toBeNull();
    expect(encoded[1]).not.toBeNull();
    expect(encoded[0].mtime).not.toEqual(encoded[1]?.mtime);

    expect(puml[0]).not.toBeNull();
    expect(puml[1]).not.toBeNull();
    expect(puml[0].mtime).not.toEqual(puml[1]?.mtime);
  });
});
