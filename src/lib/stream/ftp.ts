import * as fs from 'fs'; // Import the 'fs' module for file system operations
import * as FTP from 'ftp'; // Import the 'ftp' module for FTP operations
import { finalize } from 'node-cleanup'; // Import the 'finalize' function from the 'node-cleanup' module
import { Readable } from 'stream';

interface FTPSettings {
  host: string, // The FTP server host
  port: number, // The FTP server port
  username: string, // The FTP server username
  password: string, // The FTP server password
}

interface FileInfo {
  path: string,
  name: string, // The name of the file
  type: string, // The type of the file (e.g., file or directory)
  size: number, // The size of the file in bytes
  date: Date, // The last modified date of the file
  target?: string, // The target of a symbolic link (optional)
  stream?: Readable, // Stream to file (optional)
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
  listFiles(
    path = '/',
    fileMask?: string,
    priorFile?: string,
    includeStream = false,
  ): Promise<{
      fullPath: string,
      fileInfo: FileInfo,
      stream?: Promise<Readable>,
    }[]> {
    return new Promise((resolve, reject) => {
      // List files in the specified path on the FTP server
      this.client.list(path, (err, files: FileInfo[]) => {
        if (err) {
          reject(err);
          return;
        }

        // Map the returned files to FileInfo objects
        const fileInfoList: {
          fullPath: string,
          fileInfo: FileInfo,
          stream?: Promise<Readable>,
        }[] = files
          .filter(({ name }) => fileMask === undefined
            || new RegExp(fileMask).test(name))
          .filter(({ name }) => priorFile === undefined
            || name > priorFile)
          .map((file) => ({
            fullPath: `${path}/${file.name}`,
            fileInfo: {
              path,
              name: file.name,
              type: file.type,
              size: file.size,
              date: file.date,
              target: file.target,
            },
            ...(includeStream && { stream: this.downloadAsStream(`${path}/${file}`) }),
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
}

export default FtpClient; // Export the FtpClient class as the default export
export { FileInfo, FTPSettings }; // Export the FileInfo interface
