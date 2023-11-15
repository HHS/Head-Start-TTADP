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
    this.clones.forEach((clone) => sourceStream.pipe(clone));
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
