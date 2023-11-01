import { Readable } from 'stream';
import * as unzipper from 'unzipper';

class ZipStream {
  private readonly zipStream: Readable;

  constructor(zipStream: Readable) {
    this.zipStream = zipStream;
  }

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

  async getFileStream(filePath: string): Promise<Readable | null> {
    const fileStream = await this.zipStream
      .pipe(unzipper.ParseOne(filePath))
      .on('error', () => null)
      .promise();

    return fileStream || null;
  }
}

interface FileInfo {
  name: string;
  type: string;
  size: number;
  date: Date;
}

export default ZipStream;
export { FileInfo };
