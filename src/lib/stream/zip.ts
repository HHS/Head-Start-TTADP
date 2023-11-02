import { Readable } from 'stream';
import * as unzipper from 'unzipper';

class ZipStream {
  private readonly zipStream: Readable;

  constructor(zipStream: Readable) {
    this.zipStream = zipStream;
  }

  /**
   * Retrieves a list of files contained in the zip stream.
   * @returns A promise that resolves to an array of file paths.
   */
  async listFiles(): Promise<string[]> {
    const files: string[] = [];

    await this.zipStream
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        if (!entry.isDirectory()) {
          files.push(entry.path);
        }
        entry.autodrain();
      })
      .promise();

    return files;
  }

  /**
   * Retrieves details about a specific file in the zip stream.
   * @param filePath - The path of the file to retrieve details for.
   * @returns A promise that resolves to a FileInfo object if the file exists, or null otherwise.
   */
  async getFileDetails(filePath: string): Promise<FileInfo | null> {
    const entry = await this.zipStream
      .pipe(unzipper.ParseOne(filePath))
      .on('error', () => null)
      .promise();

    if (!entry || entry.isDirectory()) {
      return null;
    }

    return {
      name: entry.path,
      type: entry.type,
      size: entry.vars.uncompressedSize,
      date: entry.vars.lastModifiedTime,
    };
  }

  /**
   * Retrieves details for all files.
   * @returns A promise that resolves to an array of FileInfo objects or null.
   */
  async getAllFileDetails(): Promise<(FileInfo | null)[]> {
    // Retrieve the list of files
    const files = await this.listFiles();

    // Retrieve the details for each file using Promise.all and map
    return Promise.all(files.map(this.getFileDetails));
  }

  /**
   * Retrieves a readable stream for a specific file in the zip stream.
   * @param filePath - The path of the file to retrieve the stream for.
   * @returns A promise that resolves to a Readable stream if the file exists, or null otherwise.
   */
  async getFileStream(filePath: string): Promise<Readable | null> {
    const fileStream = await this.zipStream
      .pipe(unzipper.ParseOne(filePath))
      .on('error', () => null)
      .promise();

    return fileStream || null;
  }
}

/**
 * Represents information about a file.
 */
interface FileInfo {
  name: string;
  type: string;
  size: number;
  date: Date;
}

export default ZipStream;
export { FileInfo };
