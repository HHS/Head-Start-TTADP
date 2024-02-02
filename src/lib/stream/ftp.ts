import { Client, FileInfo, AccessOptions } from 'basic-ftp';
import exitHook from 'exit-hook';
import { Readable, PassThrough } from 'stream';

interface ListFileOptions {
  path: string;
  fileMask?: RegExp;
  priorFile?: string;
  includeStream?: boolean;
}

interface FileListing {
  fullPath: string;
  fileInfo: FileInfo;
  stream?: Promise<Readable>;
}

class FtpClient {
  private client: Client;

  private connectionSettings: AccessOptions;

  static cleanupRegistered = false;

  /**
   * Asynchronously handles the cleanup process for a given client.
   * If the client is not already closed, it closes the client connection.
   *
   * @param client - The client instance to be cleaned up.
   * @returns A promise that resolves when the client has been closed.
   * @throws If the client's close operation fails, an error may be thrown.
   */
  static async handleCleanup(client: Client) {
    if (client && !client.closed) {
      await client.close();
    }
  }

  /**
   * Constructs a new FtpClient instance and initializes it with the provided connection settings.
   * Registers a cleanup handler to be called on process exit if it has not been registered already.
   *
   * @param connectionSettings - The configuration options used to establish the FTP connection.
   */
  // Initialize the FtpClient instance with connection settings and prepare for cleanup.
  constructor(connectionSettings: AccessOptions) {
    // Create a new instance of the underlying Client.
    this.client = new Client();
    // Store the provided connection settings for later use.
    this.connectionSettings = connectionSettings;

    // Register a cleanup handler on process exit, but only once for all instances.
    if (!FtpClient.cleanupRegistered) {
      // Register an asynchronous exit hook to handle client cleanup on process termination.
      exitHook(async () => FtpClient.handleCleanup(this.client));
      // Mark that the cleanup handler has been registered to prevent duplicate registration.
      FtpClient.cleanupRegistered = true;
    }
  }

  /**
   * Checks if the client is currently connected.
   *
   * @returns {boolean} - True if the client is connected, false if it is closed.
   */
  public isConnected(): boolean {
    return !this.client.closed;
  }

  /**
   * Establishes a connection using the client with the provided connection settings.
   * It checks if the connection is already established before attempting to connect.
   *
   * @returns {Promise<void>} A promise that resolves when the connection is established or
   * if it's already connected.
   *
   * @throws {Error} Throws an error if the connection attempt fails.
   */
  public async connect(): Promise<void> {
    if (!this.isConnected()) {
      await this.client.access(this.connectionSettings);
    }
  }

  /**
   * Disconnects the current FTP session by cleaning up resources associated with the FTP client.
   * This function is asynchronous and returns a promise that resolves when the cleanup
   * has completed.
   *
   * @returns {Promise<void>} A promise that resolves when the client has been disconnected and
   * resources are cleaned up.
   *
   * @throws {Error} Throws an error if the cleanup process encounters any issues.
   */
  public async disconnect(): Promise<void> {
    await FtpClient.handleCleanup(this.client);
  }

  /**
   * Asynchronously lists files in a specified directory on the server.
   *
   * @param options - An object containing options for listing files.
   * @param options.path - The directory path to list the files from.
   * @param options.fileMask - An optional RegExp to filter files by name.
   * @param options.priorFile - An optional string to list files after a certain file name.
   * @param options.includeStream - An optional boolean to include a download stream for each file.
   * @returns A promise that resolves to an array of FileListing objects, each representing a file.
   *          If includeStream is true, each FileListing will include a stream to download the file.
   * @throws Will throw an error if the connection to the server fails or if the listing fails.
   */
  public async listFiles(options: ListFileOptions): Promise<FileListing[]> {
    // Destructure options to extract individual settings.
    const {
      path,
      fileMask,
      priorFile,
      includeStream = false,
    } = options;

    // Ensure there is a connection before proceeding.
    await this.connect();

    // Retrieve the list of files from the client at the specified path.
    const files = await this.client.list(path);

    // Filter the retrieved files based on the provided file mask and whether they come
    // after a specified 'priorFile'.
    const filteredFiles = files.filter((file) => {
      const matchesMask = fileMask ? fileMask.test(file.name) : true;
      const afterPriorFile = priorFile ? file.name.localeCompare(priorFile) > 0 : true;
      return matchesMask && afterPriorFile;
    });

    // Map the filtered files to a list of FileListing objects, including a download
    // stream if requested.
    const listings = filteredFiles.map((file) => {
      const fullPath = `${path}/${file.name}`;
      const listing: FileListing = { fullPath, fileInfo: file };
      if (includeStream) {
        // If streams are included, attach a stream to download the file.
        listing.stream = this.downloadAsStream(fullPath);
      }
      return listing;
    });

    // Return the list of FileListing objects.
    return listings;
  }

  /**
   * Initiates a download of a file from a remote path as a readable stream.
   *
   * @param remoteFilePath - The path to the remote file to be downloaded.
   * @param startAt - The byte offset at which to begin the download (default is 0).
   * @returns A Promise that resolves to a Readable stream from which the file can be read.
   *
   * @throws Will throw an error if the connection fails or if the download encounters an error.
   */
  public async downloadAsStream(
    remoteFilePath: string,
    startAt = 0,
  ): Promise<Readable> {
    await this.connect();
    const stream = new PassThrough(); // Create a PassThrough stream as a proxy
    await this.client.downloadTo(stream, remoteFilePath, startAt);
    return stream;
  }
}

export default FtpClient; // Export the FtpClient class as the default export
export { FileInfo, AccessOptions as FTPSettings }; // Export the FileInfo interface
