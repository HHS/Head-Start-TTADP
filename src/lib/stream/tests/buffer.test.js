import { Writable, Readable } from 'stream';
import BufferStream from '../buffer';

describe('BufferStream', () => {
  let bufferStream;

  beforeEach(() => {
    bufferStream = new BufferStream();
  });

  it('should be an instance of Writable', () => {
    expect(bufferStream).toBeInstanceOf(Writable);
  });

  it('should start with an empty buffer', () => {
    expect(bufferStream.getSize()).toBe(0);
  });

  it('should store written data in chunks', () => {
    const data = 'test';

    // Return the promise
    return new Promise((resolve, reject) => {
      bufferStream.write(data, 'utf-8', (err) => {
        if (err) {
          reject(err); // Reject the promise if there is an error
        } else {
          try {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(bufferStream.getSize()).toBe(1);
            resolve(); // Resolve the promise if everything went well
          } catch (error) {
            reject(error); // Reject the promise if the assertion fails
          }
        }
      });
    });
  });

  it('should return a readable stream immediately if finished', async () => {
    const data = 'test';
    bufferStream.write(data);
    bufferStream.end();

    const readable = await bufferStream.getReadableStream();
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => {
      expect(Buffer.concat(chunks).toString()).toBe(data);
    });
  });

  it('should return a readable stream once finished if not already finished', () => {
    const data = 'test';

    bufferStream.write(data);
    bufferStream.end(); // This is necessary to trigger the 'finish' event

    return bufferStream.getReadableStream().then((readable) => {
      const chunks = [];
      return new Promise((resolve, reject) => {
        readable.on('data', (chunk) => chunks.push(chunk));
        readable.on('end', () => {
          try {
            expect(Buffer.concat(chunks).toString()).toBe(data);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        readable.on('error', reject);
      });
    });
  });

  it('should handle multiple writes before creating a readable stream', async () => {
    const data1 = 'hello';
    const data2 = 'world';
    bufferStream.write(data1);
    bufferStream.write(data2);
    bufferStream.end();

    const readable = await bufferStream.getReadableStream();
    const chunks = [];

    await new Promise((resolve, reject) => {
      readable.on('data', (chunk) => chunks.push(chunk));
      readable.on('error', reject);
      readable.on('end', resolve);
    });

    expect(Buffer.concat(chunks).toString()).toBe(data1 + data2);
  });

  it('should throw an error if non-buffer chunks are written', () => {
    expect(() => {
      // @ts-ignore
      bufferStream.write(123);
    }).toThrow();
  });

  it('should return a promise that resolves to a Readable stream when finished', async () => {
    // Write some data to the buffer stream
    bufferStream.write('test data', 'utf-8', () => {});

    // Simulate the finish event
    bufferStream.end();

    // Get the readable stream promise
    const readablePromise = bufferStream.getReadableStream();

    // Expect the promise to resolve to a Readable instance
    await expect(readablePromise).resolves.toBeInstanceOf(Readable);

    // Verify that the Readable stream contains the correct data
    const readableStream = await readablePromise;
    const chunks = [];
    readableStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Wait for the 'end' event before checking the content
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => readableStream.on('end', resolve));

    // Concatenate the chunks and convert to a string
    const data = Buffer.concat(chunks).toString();

    // Verify the data matches what was written
    expect(data).toBe('test data');
  });

  it('should return a promise that resolves to a Readable stream when not finished', async () => {
    // Write some data to the buffer stream
    bufferStream.write('test data', 'utf-8', () => {});

    // Get the readable stream promise before finishing the stream
    const readablePromise = bufferStream.getReadableStream();

    // Simulate the finish event after setting up the promise
    bufferStream.end();

    // Expect the promise to resolve to a Readable instance
    await expect(readablePromise).resolves.toBeInstanceOf(Readable);

    // Verify that the Readable stream contains the correct data
    const readableStream = await readablePromise;
    const chunks = [];
    readableStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Wait for the 'end' event before checking the content
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => readableStream.on('end', resolve));

    // Concatenate the chunks and convert to a string
    const data = Buffer.concat(chunks).toString();

    // Verify the data matches what was written
    expect(data).toBe('test data');
  });

  it('should return a resolved promise with a readable stream if already finished', async () => {
    bufferStream.end();
    const readable = await bufferStream.getReadableStream();
    expect(readable).toBeInstanceOf(Readable);
  });

  it('should return a promise that resolves immediately if the stream is finished', async () => {
    bufferStream.write('test data');
    bufferStream.end();

    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => bufferStream.on('finish', resolve));

    const readable = await bufferStream.getReadableStream();
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => readable.on('end', resolve));
    expect(Buffer.concat(chunks).toString()).toBe('test data');
  });

  it('should return the same promise if called multiple times before finishing', async () => {
    const promise1 = bufferStream.getReadableStream();
    const promise2 = bufferStream.getReadableStream();
    expect(promise1).toBe(promise2);
    bufferStream.write('test data');
    bufferStream.end();
    const readable = await promise1;
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => readable.on('end', resolve));
    expect(Buffer.concat(chunks).toString()).toBe('test data');
  });
});
