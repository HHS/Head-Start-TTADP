import FTP from 'ftp'; // Import the 'ftp' module for FTP operations
import nodeCleanup from 'node-cleanup'; // Import the 'finalize' function from the 'node-cleanup' module
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

function joinPaths(basePath: string, fileName: string): string {
  if (!basePath || !fileName) return basePath || fileName;
  return `${basePath.replace(/\/+$/, '')}/${fileName.replace(/^\/+/, '')}`;
}

class FtpClient {
  private client; // Private property to store the FTP client instance

  // One way to handle this is to use a static property to track if cleanup has been registered
  static cleanupRegistered = false;

  // Use a static method to handle cleanup
  static handleCleanup(client: FTP) {
    console.log(client);
    if (client && client.connected) {
      client.end();
    }
  }

  constructor(
    private ftpSettings: FTPSettings, // Constructor parameter to store the FTP settings
  ) {
    this.client = new FTP(); // Create a new FTP client instance
    if (!FtpClient.cleanupRegistered) {
      nodeCleanup(() => {
        FtpClient.handleCleanup(this.client);
      });
      FtpClient.cleanupRegistered = true;
    }
  }

  /**
   * Connects to the FTP server.
   * @returns A promise that resolves when the connection is established, or rejects with an error.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let onError;
      const onReady = () => {
        this.client.removeListener('error', onError); // Remove error listener
        this.client.removeListener('ready', onReady); // Remove ready listener
        resolve();
      };
      onError = (err: Error) => {
        this.client.removeListener('error', onError); // Remove error listener
        this.client.removeListener('ready', onReady); // Remove ready listener
        reject(err);
      };

      this.client.once('ready', onReady);
      this.client.once('error', onError);

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
    FtpClient.handleCleanup(this.client);
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

        if (!Array.isArray(files)) {
          reject(new Error('Invalid server response'));
          return;
        }

        const fileMaskRegex = fileMask
          ? new RegExp(fileMask)
          : null;
        const isAfterPriorFile = priorFile
          ? (name: string) => name > priorFile
          : () => true;

        // Map the returned files to FileInfo objects
        const fileInfoList: {
          fullPath: string,
          fileInfo: FileInfo,
          stream?: Promise<Readable>,
        }[] = files
          .filter((file) => typeof file === 'object'
            && 'name' in file
            && 'type' in file
            && 'size' in file
            && 'date' in file)
          .filter(({ name }) => !fileMaskRegex || fileMaskRegex.test(name))
          .filter(({ name }) => isAfterPriorFile(name))
          .map((file) => ({
            fullPath: joinPaths(path, file.name),
            fileInfo: {
              path,
              name: file.name,
              type: file.type,
              size: file.size,
              date: file.date,
              ...(file.target && { target: file.target }),
            },
            ...(includeStream && { stream: this.downloadAsStream(`${path}/${file.name}`) }),
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
  downloadAsStream(remoteFilePath: string, useCompression = true): Promise<Readable> {
    return new Promise((resolve, reject) => {
      // Get a readable stream for the specified file on the FTP server
      this.client.get(
        remoteFilePath,
        useCompression,
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
