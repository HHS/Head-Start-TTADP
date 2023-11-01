import * as fs from 'fs';
import FtpClient, { FileInfo } from '../stream/ftp';
import ZipStream from '../stream/zip';
import EncodingConverter from '../stream/encoding';
import XMLStream from '../stream/xml';

/**
 * 1) Stream file from FTP to S3
 * 2) Stream extract zip file on S3 to an array of file streams
 * 3) Transcode each file stream from utf-16 to utf-8 stream
 * 4)
 */

/**
 * EXAMPLE CODE:
 ftpClient.on('ready', () => {
  ftpClient.get('PATH_TO_FILE_ON_FTP_SERVER', (err, stream) => {
    if (err) throw err;

    const s3 = new AWS.S3();
    const params = {
      Bucket: 'YOUR_S3_BUCKET_NAME',
      Key: 'DESTINATION_FILE_NAME',
      Body: stream
    };

    s3.upload(params, (err, data) => {
      if (err) throw err;
      console.log('File uploaded successfully:', data.Location);
      ftpClient.end(); // Close the FTP connection
    });
  });
});
 */

const getLatestFileStreamFromFTP = async (
  ftpSettings: {
    host: string,
    port: number,
    username: string,
    password: string,
  },
) => {
  const ftpClient = new FtpClient(ftpSettings);

  try {
    // Connect to FTP server
    await ftpClient.connect();

    // List all files
    const files: FileInfo[] = await ftpClient.listFiles('/path/to/files');
    console.log('Files:', files);

    // Get the latest file
    const latestFile: FileInfo | undefined = files.reduce((
      prev,
      current,
    ) => (prev.date > current.date
      ? prev
      : current));
    console.log('Latest File:', latestFile);

    if (latestFile) {
      // Download the latest file as a stream
      const stream: fs.ReadStream = await ftpClient.downloadAsStream(`/path/to/files/${latestFile.name}`);
      console.log('Downloaded Stream:', stream);

      // Wait for the stream to close before disconnecting from FTP server
      stream.on('close', () => {
        console.log('Stream closed');
        ftpClient.disconnect();
      });

      // Return the stream
      return stream;
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // If no latest file or error occurred, return undefined
  return undefined;
};


const processFTP = () => {
  const stream: fs.ReadStream | undefined = await getLatestFileStreamFromFTP();
};
