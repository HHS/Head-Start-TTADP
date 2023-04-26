import fs from 'fs';
import logicalDataModel from './logicalDataModel';

describe('logicalDataModel', () => {
  it('logicalDataModel', async () => {
    const encoded = [];
    const puml = [];
    const svg = [];

    const callBack = (err, stats, fileSet) => {
      if (!err) fileSet.push(stats);
    };

    fs.stat('./docs/logical_data_model.encoded', (err, stats) => callBack(err, stats, encoded));
    fs.stat('./docs/logical_data_model.puml', (err, stats) => callBack(err, stats, puml));
    fs.stat('./docs/logical_data_model.svg', (err, stats) => callBack(err, stats, svg));

    await logicalDataModel();

    fs.stat('./docs/logical_data_model.encoded', (err, stats) => callBack(err, stats, encoded));
    fs.stat('./docs/logical_data_model.puml', (err, stats) => callBack(err, stats, puml));
    fs.stat('./docs/logical_data_model.svg', (err, stats) => callBack(err, stats, svg));

    console.log(encoded);
    expect(encoded[0].mtime).not.toEqual(encoded[1].mtime);
    expect(puml[0].mtime).not.toEqual(puml[1].mtime);
    expect(svg[0].mtime).not.toEqual(svg[1].mtime);
  });
});
