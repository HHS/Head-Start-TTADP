import * as fs from 'fs'; // Import the 'fs' module for file system operations
import * as FTP from 'ftp'; // Import the 'ftp' module for FTP operations
import { finalize } from 'node-cleanup'; // Import the 'finalize' function from the 'node-cleanup' module

interface FTPSettings {
  host: string, // The FTP server host
  port: number, // The FTP server port
  username: string, // The FTP server username
  password: string, // The FTP server password
}

interface FileInfo {
  name: string; // The name of the file
  type: string; // The type of the file (e.g., file or directory)
  size: number; // The size of the file in bytes
  date: Date; // The last modified date of the file
  target?: string; // The target of a symbolic link (optional)
}

class FtpClient {
  private client: FTP; // Private property to store the FTP client instance

  constructor(
    private ftpSettings: FTPSettings, // Constructor parameter to store the FTP settings
  ) {
    this.client = new FTP(); // Create a new FTP client instance
    finalize(() => { // Register a cleanup function to be called when the process exits
      this.disconnect(); // Disconnect from the FTP server
    });
  }

  /**
   * Connects to the FTP server.
   * @returns A promise that resolves when the connection is established, or rejects with an error.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => { // Event handler for the 'ready' event, emitted when the connection is established
        resolve();
      });

      this.client.on('error', (err) => { // Event handler for the 'error' event, emitted when there is an error during the connection
        reject(err);
      });

      this.client.connect({ // Connect to the FTP server using the provided settings
        host: this.ftpSettings.host,
        port: this.ftpSettings.port,
        user: this.ftpSettings.username,
        password: this.ftpSettings.password,
      });
    });
  }

  /**
   * Disconnects from the FTP server.
   */
  disconnect(): void {
    this.client.end(); // Close the FTP client connection
  }

  /**
   * Lists files in the specified path on the FTP server.
   * @param path - The path to list files from.
   * @returns A promise that resolves with an array of file information, or rejects with an error.
   */
  listFiles(path = '/'): Promise<FileInfo[]> {
    return new Promise((resolve, reject) => {
      this.client.list(path, (err, files) => { // List files in the specified path on the FTP server
        if (err) {
          reject(err);
          return;
        }
        // Map the returned files to FileInfo objects
        const fileInfoList: FileInfo[] = files.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          date: file.date,
          target: file.target,
        }));

        resolve(fileInfoList);
      });
    });
  }

  /**
   * Downloads a file from the FTP server as a readable stream.
   * @param remoteFilePath - The path of the file to download on the FTP server.
   * @returns A promise that resolves with a readable stream representing the downloaded file, or
   * rejects with an error.
   */
  downloadAsStream(remoteFilePath: string): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      // Get a readable stream for the specified file on the FTP server
      this.client.get(
        remoteFilePath,
        true, // use compression
        (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(stream);
        },
      );
    });
  }

  /**
   * Retrieves the latest file from a given path and returns it as a stream.
   * @param path - The path to retrieve the latest file from.
   * @returns A Promise that resolves to an object containing the path, fileInfo, and stream of the latest file, or null if no files are found.
   */
  async getLatest(path: string): Promise<{
    path: string,
    fileInfo: FileInfo,
    stream: fs.ReadStream
  } | null> {
    return new Promise(async (resolve, reject) => {
      try {
        // List all files
        const files: FileInfo[] = await this.listFiles(path);
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
          const stream: fs.ReadStream = await this.downloadAsStream(`${path}/${latestFile.name}`);
          console.log('Downloaded Stream:', stream);

          // Wait for the stream to close before disconnecting from FTP server
          stream.on('close', this.disconnect);

          // Return the stream
          resolve({
            path,
            fileInfo: latestFile,
            stream,
          });
        }
      } catch (err) {
        console.error('Error:', err);
        reject(err);
      }
      reject();
    });
  }
}

export default FtpClient; // Export the FtpClient class as the default export
export { FileInfo, FTPSettings }; // Export the FileInfo interface
