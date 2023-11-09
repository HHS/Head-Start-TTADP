import { Readable, PassThrough } from 'stream';

class Cloner {
  private clones: PassThrough[];

  constructor(
    private sourceStream: Readable, // The source stream to be cloned
    private n: number, // The number of clones to create
  ) {
    this.sourceStream = sourceStream;
    this.n = n;
    this.clones = [];

    // Initialize clones as PassThrough streams.
    this.clones = Array.from({ length: n }, () => new PassThrough());

    this.cloneStreams();
  }

  /**
   * Clone the source stream by piping its data to each clone.
   */
  private cloneStreams() {
    // When data is received from the source stream
    this.sourceStream.on('data', (chunk) => {
      // Write the chunk to each clone stream
      this.clones.forEach((clone) => {
        clone.write(chunk);
      });
    });

    // When the source stream ends
    this.sourceStream.on('end', () => {
      // End each clone stream
      this.clones.forEach((clone) => {
        clone.end();
      });
    });

    // When an error occurs in the source stream
    this.sourceStream.on('error', (err) => {
      // Emit the error to each clone stream
      this.clones.forEach((clone) => {
        clone.emit('error', err);
      });
    });
  }

  /**
   * Get the array of clone streams.
   * @returns An array of clone streams.
   */
  public getClones(): Readable[] {
    return this.clones;
  }
}

export default Cloner;
