// import tmp from 'temporary';
// import { downloadFile } from '../lib/s3';
// import { sequelize, Files } from '../models';
// import { auditLogger } from '../logger';

// const processFile = async (dbFile) => {
//   const fileHandle = await downloadFile(dbFile.key);
//   const tmpFile = new tmp.File(dbFile.key);
// };

// const processFiles = async () => {
//   const allFiles = await Files.all();

//   for (let fi = 0; fi < allFiles.length; ++fi) { // eslint-disable-line no-plusplus
//     const processed = await processFile(allFiles[fi]);
//   }
// };
