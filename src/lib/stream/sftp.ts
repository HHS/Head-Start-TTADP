import { Client } from 'ssh2';
import { Readable } from 'stream';
import { auditLogger } from '../../logger';

interface ConnectConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  algorithms?: Record<string, any>,
  hostVerifier?: (hashedKey:string, callback: (response) => void) => boolean,
}

interface ListFileOptions {
  path: string;
  fileMask?: string;
  priorFile?: string;
  includeStream?: boolean;
}

interface FileInfo {
  name: string;
  path: string;
  type: string;
  size: number;
  modifyTime: Date;
  accessTime: Date;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
}

interface FileListing {
  fullPath: string;
  fileInfo: FileInfo;
  stream?: Readable;
}

/**
 * Converts a numeric mode (from a file system stat call) into a human-readable string
 * representing file permissions in the Unix `rwx` format.
 *
 * @param mode - The numeric mode value to be converted.
 * @returns A string representing the file permissions and type. The first character
 *          indicates the file type (e.g., '-' for regular file, 'd' for directory),
 *          followed by nine characters representing the owner, group, and other
 *          permissions (e.g., 'rwxr-xr--').
 */
/* eslint-disable no-bitwise */
function modeToPermissions(mode: number): string {
  // Constants for the permission bits
  const READ = 4;
  const WRITE = 2;
  const EXECUTE = 1;

  // Masks for the file type
  const FILE_TYPE_MASK = 0o170000;
  const REGULAR_FILE = 0o100000;
  const DIRECTORY = 0o040000;
  // ... add other file types as needed

  // Helper function to convert a single octal digit to rwx string
  function toRwxString(value: number): string {
    return (
      (value & READ ? 'r' : '-')
      + (value & WRITE ? 'w' : '-')
      + (value & EXECUTE ? 'x' : '-')
    );
  }

  // Extract the file type and permissions
  const fileType = mode & FILE_TYPE_MASK;
  const ownerPermissions = (mode >> 6) & 0o7;
  const groupPermissions = (mode >> 3) & 0o7;
  const otherPermissions = mode & 0o7;

  // Convert the file type to a string
  let typeChar = '-';
  if (fileType === REGULAR_FILE) {
    typeChar = '-';
  } else if (fileType === DIRECTORY) {
    typeChar = 'd';
  }
  // ... add other file types as needed

  // Convert permissions to string
  const ownerPermsString = toRwxString(ownerPermissions);
  const groupPermsString = toRwxString(groupPermissions);
  const otherPermsString = toRwxString(otherPermissions);

  return typeChar + ownerPermsString + groupPermsString + otherPermsString;
}
/* eslint-enable no-bitwise */

class SftpClient {
  private client = new Client();

  private connected = false; // Add a property to track the connection state

  /**
   * Attaches event listeners for handling connection status changes and registering
   * signal handlers.
   */
  private attachListeners(): void {
    // Set the connected flag to false when the connection is closed
    this.client.on('end', () => {
      this.connected = false;
    });
    this.client.on('close', () => {
      this.connected = false;
    });

    // Register the signal handlers when the instance is created
    process.on('SIGINT', this.handleSignal.bind(this));
    process.on('SIGTERM', this.handleSignal.bind(this));
    process.on('SIGQUIT', this.handleSignal.bind(this));
  }

  /**
   * Detaches event listeners to prevent memory leaks.
   */
  private detachListeners(): void {
    if (this.client && this.client.removeAllListeners) {
      this.client.removeAllListeners(); // Remove all listeners to avoid memory leaks
    }
    process.removeListener('SIGINT', this.handleSignal.bind(this));
    process.removeListener('SIGTERM', this.handleSignal.bind(this));
    process.removeListener('SIGQUIT', this.handleSignal.bind(this));
  }

  /**
   * Constructs an instance and registers signal handlers for SIGINT, SIGTERM, and SIGQUIT.
   * @param connectionSettings - The configuration settings used to connect to a service.
   */
  constructor(private connectionSettings: ConnectConfig) {
    this.attachListeners();
  }

  /**
   * Checks if the client is currently connected.
   *
   * @returns {boolean} True if the client is connected, false otherwise.
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Establishes a connection using the client with the provided connection settings.
   * It returns a promise that resolves when the client is ready and rejects if an error
   * occurs during the connection attempt.
   *
   * @returns {Promise<void>} A promise that resolves with no value when the connection
   * is successfully established, or rejects with an error if the connection fails.
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.connected) {
          resolve();
          return;
        }
        this.detachListeners();

        // Create a new Client instance if the previous one is unusable
        this.client = new Client();
        this.attachListeners();

        // Set up event listeners for the new Client instance
        this.client
          .on('ready', () => {
            this.connected = true;
            resolve();
          })
          /* istanbul ignore next: hard to test errors */
          .on('error', (err) => {
            auditLogger.error(JSON.stringify(err));
            this.connected = false; // Ensure the connected flag is set to false on error
            reject(err);
          })
          .on('end', () => {
            this.connected = false;
          })
          .on('close', (hadError) => {
            this.connected = false;
            if (hadError) {
              auditLogger.error(JSON.stringify(hadError));
              reject(new Error('Connection closed due to a transmission error'));
            }
          });

        const {
          algorithms = {
            serverHostKey: ['ssh-dss', 'ssh-rsa'],
          },
          hostVerifier = () => true,
          ...connectionSettings
        } = this.connectionSettings;

        // Attempt to connect with the new Client instance
        this.client.connect({
          ...connectionSettings,
          algorithms,
          // Accept any hashedKey
          hostVerifier: (_hashedKey, callback) => { callback(true); return true; },
        });
      } catch (err) {
        reject(err.message);
      }
    });
  }

  /**
   * Closes the connection to the client.
   * This method does not take any parameters and does not return any value.
   * If the client is already disconnected, calling this method may result in an error.
   */
  public disconnect(): void {
    try {
      if (this.isConnected()) {
        this.client.end(); // End the current connection
        this.connected = false;
      }
      this.detachListeners();
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
    }
  }

  /**
   * Handles the specified system signal by disconnecting the FTP client and
   * terminating the process. This is meant to perform necessary cleanup when
   * the process receives a signal like SIGINT or SIGTERM.
   *
   * @param signal - The signal received from the NodeJS process.
   */
  private handleSignal(signal: NodeJS.Signals): void {
    // console.log(`Received ${signal}, closing FTP client...`);
    this.disconnect();
    // After handling the cleanup, we should allow the process to exit naturally
    process.exit();
  }

  /**
   * Asynchronously lists files in a specified directory on a remote SFTP server.
   *
   * @param options - The `ListFileOptions` object containing the following properties:
   *   - `path`: The directory path to list files from.
   *   - `fileMask`: An optional RegExp to filter files by name.
   *   - `priorFile`: An optional string to list files that come after this file name in
   * lexicographical order.
   *   - `includeStream`: An optional boolean to determine if a read stream should be
   * included for each file.
   *
   * @returns A Promise that resolves to an array of `FileListing` objects, each representing
   * a file and its details.
   * If `includeStream` is true, each `FileListing` will also include a read stream for the file.
   *
   * The function rejects the Promise with an error if there's an issue connecting to the SFTP
   * server or reading the directory.
   */
  public async listFiles(options: ListFileOptions): Promise<FileListing[]> {
    if (!this.isConnected()) await this.connect();
    // Destructure options to extract individual settings
    const {
      path,
      fileMask,
      priorFile,
      includeStream = false,
    } = options;

    // Return a new promise that will handle the asynchronous file listing
    return new Promise((resolve, reject) => {
      // Use the SFTP client to start an SFTP session
      this.client.sftp((err_sftp, sftp) => {
        // If an error occurs during SFTP session initialization, reject the promise
        if (err_sftp) {
          reject(err_sftp);
          return;
        }

        // Read the directory contents at the given path
        sftp.readdir(path, (err_readdir, list) => {
          // If an error occurs while reading the directory, reject the promise
          if (err_readdir) {
            reject(err_readdir);
            return;
          }

          // Map the raw directory listing to a structured format
          let files = list.map(({ filename, longname, attrs }) => {
            // Convert file permissions to a string, assuming Unix-like permissions in octal
            const permissions = attrs.permissions
              ? attrs.permissions.toString(8)
              : modeToPermissions(attrs.mode);
            // Construct a file listing object with detailed file information
            return {
              fullPath: `${path}/${filename}`,
              fileInfo: {
                name: filename,
                path,
                type: longname[0],
                size: attrs.size,
                modifyTime: attrs.mtime * 1000,
                accessTime: attrs.atime * 1000,
                rights: {
                  user: permissions.substring(1, 4),
                  group: permissions.substring(4, 7),
                  other: permissions.substring(7, 10),
                },
                owner: attrs.uid,
                group: attrs.gid,
              },
            };
          // Filter the files based on the provided file mask and whether they come after a
          // specified 'priorFile'
          }).filter((file) => {
            const matchesMask = fileMask && fileMask.length > 0
              ? (new RegExp(fileMask)).test(file.fileInfo.name)
              : true;
            const afterPriorFile = priorFile && priorFile.length > 0
              ? file.fileInfo.name.localeCompare(priorFile) > 0
              : true;
            return matchesMask && afterPriorFile;
          });

          // If the 'includeStream' option is true, attach a read stream for each file
          if (includeStream && files.length > 0) {
            files = files.map((file) => {
              const stream = sftp.createReadStream(file.fullPath);
              return { ...file, stream };
            });
          }

          // Resolve the promise with the filtered and possibly augmented list of files
          resolve(files);
        });
      });
    });
  }

  /**
   * Initiates a download of a file from a remote path as a readable stream.
   *
   * @param remoteFilePath - The path to the file on the remote server.
   * @param useCompression - Optional. If set to true, the stream will be compressed.
   *                         Defaults to false.
   * @returns A promise that resolves to a Readable stream of the requested file.
   *          The promise will be rejected if there is an error initiating the SFTP connection
   *          or creating the read stream.
   */
  public async downloadAsStream(
    remoteFilePath: string,
    useCompression = false,
  ): Promise<Readable> {
    if (!this.isConnected()) await this.connect();
    // Return a promise that will resolve with the readable stream or reject with an error.
    return new Promise((resolve, reject) => {
      // Use the SFTP client to establish an SFTP session.
      this.client.sftp((err, sftp) => {
        // If an error occurs while establishing the SFTP session, reject the promise.
        if (err) {
          reject(err);
          return;
        }

        // Set stream options based on whether compression is used.
        const streamOptions = useCompression ? { autoClose: true, highWaterMark: 65536 } : {};
        // Create a read stream for the remote file with the specified options.
        const stream = sftp.createReadStream(remoteFilePath, streamOptions);
        // Resolve the promise with the created read stream.
        resolve(stream);
      });
    });
  }
}

export default SftpClient; // Export the FtpClient class as the default export
export {
  FileInfo,
  ConnectConfig as SFTPSettings,
  FileListing,
}; // Export the FileInfo interface
