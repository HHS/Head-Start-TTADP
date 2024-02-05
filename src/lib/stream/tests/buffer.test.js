import { Writable } from 'stream';
import BufferStream from '../buffer';

describe('BufferStream', () => {
  let bufferStream;

  beforeEach(() => {
    bufferStream = new BufferStream();
  });

  test('should be an instance of Writable', () => {
    expect(bufferStream).toBeInstanceOf(Writable);
  });

  test('should start with an empty buffer', () => {
    expect(bufferStream.getSize()).toBe(0);
  });

  test('should store written data in chunks', () => {
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

  test('should return a readable stream immediately if finished', async () => {
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

  test('should return a readable stream once finished if not already finished', () => {
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

  test('should handle multiple writes before creating a readable stream', async () => {
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

  test('should throw an error if non-buffer chunks are written', () => {
    expect(() => {
      // @ts-ignore
      bufferStream.write(123);
    }).toThrow();
  });
});
