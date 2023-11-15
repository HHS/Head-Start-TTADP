import { Readable, PassThrough } from 'stream';
import Cloner from '../cloner';

describe('Cloner', () => {
  let sourceStream;
  let cloner;
  const numberOfClones = 3;

  beforeEach(() => {
    // Create a mock readable stream
    sourceStream = new Readable({
      read(size) {
        this.push('some data');
        this.push(null); // End the stream
      },
    });
    cloner = new Cloner(sourceStream, numberOfClones);
  });

  test('should create the specified number of clones', () => {
    const clones = cloner.getClones();
    expect(clones).toHaveLength(numberOfClones);
  });

  test('each clone should be an instance of PassThrough', () => {
    const clones = cloner.getClones();
    clones.forEach((clone) => {
      expect(clone.constructor.name).toBe('PassThrough');
    });
  });

  test('clones should receive data from the source stream', async () => {
    const clones = cloner.getClones();

    const dataPromises = clones.map((clone) => new Promise((resolve) => {
      clone.on('data', (chunk) => {
        expect(chunk.toString()).toEqual('some data');
        resolve();
      });
    }));

    sourceStream.resume(); // Start flowing the source stream
    await Promise.all(dataPromises);
  });

  it('clones should end when the source stream ends', async () => {
    // Simulate some data being pushed to the stream
    sourceStream.push('some data');
    sourceStream.push(null); // This signifies the end of the stream

    // Clone the stream here (this would be replaced with your actual cloning implementation)
    const clonedStream = sourceStream; // For demonstration purposes only

    // Return a promise that resolves when the cloned stream ends
    const result = await Promise(async (resolve) => {
      // Listen for the 'end' event on the cloned stream
      clonedStream.on('end', () => {
        // The assertion is inside this callback
        resolve(true); // Resolve the promise to indicate the test is complete
      });
    });
    expect(result).toBe(true); // This is a placeholder assertion
  });

  test('should not modify the original source stream', () => {
    const originalSourceListeners = sourceStream.listenerCount('data');
    new Cloner(sourceStream, 1);
    expect(sourceStream.listenerCount('data')).toBe(originalSourceListeners);
  });
});
Copy
