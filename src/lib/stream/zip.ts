import { Readable, PassThrough } from 'stream';
import * as unzipper from 'unzipper';
import * as path from 'path';

class ZipStream {
  private readonly zipStream: Readable;

  private readonly fileDetails: FileInfo[] = [];

  private readonly fileStreams: Map<string, Readable>;

  private readonly processingComplete: Promise<void>;

  private resolveProcessing: () => void;

  constructor(
    zipStream: Readable,
    private password?: string,
  ) {
    this.zipStream = zipStream;
    this.fileStreams = new Map<string, Readable>();

    // Create a PassThrough stream to duplicate the input stream
    const passThrough = new PassThrough();
    this.zipStream.pipe(passThrough);

    // Initialize the processingComplete promise and its resolver
    this.processingComplete = new Promise<void>((resolve) => {
      this.resolveProcessing = resolve;
    });

    passThrough
      .pipe(unzipper.Parse({ password: this.password }))
      .on('entry', (entry) => {
        if (entry.type === 'File') {
          const fileName = path.basename(entry.path);
          const fileDir = path.dirname(entry.path);
          const fileInfo: FileInfo = {
            name: fileName,
            path: fileDir,
            type: entry.type,
            size: entry.vars.uncompressedSize,
            date: entry.vars.lastModifiedTime,
          };

          this.fileDetails.push(fileInfo);

          // Duplicate the stream for this file
          const fileStream = new PassThrough();
          entry.pipe(fileStream);
          this.fileStreams.set(entry.path, fileStream);
        } else {
          entry.autodrain();
        }
      })
      .on('error', (error) => {
        // Handle the error
      })
      .on('finish', () => {
        this.resolveProcessing(); // Resolve the promise when the finish event is emitted
      });
  }

  async listFiles(): Promise<string[]> {
    await this.processingComplete; // Wait for the processing to complete
    return this.fileDetails.map((file) => path.join(file.path, file.name));
  }

  async getFileDetails(filePath: string): Promise<FileInfo | null> {
    await this.processingComplete; // Wait for the processing to complete
    return this.fileDetails.find((file) => path.join(file.path, file.name) === filePath) || null;
  }

  async getAllFileDetails(): Promise<FileInfo[]> {
    await this.processingComplete; // Wait for the processing to complete
    return this.fileDetails;
  }

  async getFileStream(filePath: string): Promise<Readable | null> {
    await this.processingComplete; // Wait for the processing to complete
    return this.fileStreams.get(filePath) || null;
  }
}

/**
 * Represents information about a file.
 */
interface FileInfo {
  name: string;
  path: string;
  type: string;
  size: number;
  date: Date;
}

export default ZipStream;
export { FileInfo };
