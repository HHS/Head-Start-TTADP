import temp from 'temp';
import generateMetadataFromFile from '../lib/fileProcessing';
import { downloadFile } from '../lib/s3';
import { sequelize, File } from '../models';
import { updateMetadata } from '../services/files';
import { auditLogger } from '../logger';

sequelize.transaction(async (transaction) => {
  const files = File.find({ where: { metadata: null }, transaction });
  files.map(async (file) => {
    try {
      temp.track(); // Automatically track and cleanup files at exit
      const stream = temp.createWriteStream();
      stream.write(await downloadFile(files.key));
      await updateMetadata(file.id, generateMetadataFromFile(stream.path));
      stream.end();
    } catch (err) {
      auditLogger.error(err);
    }
  });
});
