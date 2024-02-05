import { Writable, Readable } from 'stream';

class BufferStream extends Writable {
  private chunks: Buffer[] = [];

  private finished = false;

  private resolveReadable: ((readable: Readable) => void) | null = null;

  private readablePromise: Promise<Readable> | null = null;

  constructor(options?) {
    super(options);
    this.on('finish', () => {
      this.finished = true;
      if (this.resolveReadable) {
        this.resolveReadable(Readable.from(this.getBuffer()));
      }
    });
  }

  // eslint-disable-next-line no-underscore-dangle
  _write(chunk, encoding: string, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }

  getReadableStream(): Promise<Readable> {
    if (this.finished) {
      // If the stream is already finished, return a promise that resolves immediately.
      return Promise.resolve(Readable.from(this.getBuffer()));
    }
    // If the stream is not finished, return a promise that will resolve later.
    if (!this.readablePromise) {
      this.readablePromise = new Promise<Readable>((resolve) => {
        this.resolveReadable = resolve;
      });
    }
    return this.readablePromise;
  }

  getSize(): number {
    return this.chunks.length;
  }

  private getBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

export default BufferStream;
