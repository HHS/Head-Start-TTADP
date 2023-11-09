import * as crypto from 'crypto';
import { Readable } from 'stream';

// Define an object that maps algorithm names to their corresponding string values
const Algorithms = {
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA384: 'sha384',
  SHA512: 'sha512',
  MD5: 'md5',
  RIPEMD160: 'ripemd160',
};

// Create a type alias for the values of the Algorithms object
type Algorithm = typeof Algorithms[keyof typeof Algorithms];

// Define a class called Hasher
class Hasher {
  constructor(private stream: Readable) {}

  /**
   * Generate a hash using the specified algorithm.
   *
   * @param algorithm - The algorithm to use for hashing. Defaults to SHA256.
   * @returns A promise that resolves with the generated hash as a hexadecimal string.
   */
  public generateHash(algorithm: Algorithm = Algorithms.SHA256): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      let dataReceived = false;

      let dataListener;
      let endListener;
      let errorListener;
      const clearListeners = () => {
        this.stream.off('data', dataListener);
        this.stream.off('end', endListener);
        this.stream.off('error', errorListener);
      };
      dataListener = (chunk) => {
        dataReceived = true;
        hash.update(chunk);
      };
      endListener = () => {
        if (!dataReceived) {
          resolve('');
        } else {
          resolve(hash.digest('hex'));
        }
        clearListeners();
      };
      errorListener = (err) => {
        reject(err);
        clearListeners();
      };

      // Listen for 'data' events and update the hash
      this.stream.on('data', dataListener);

      // Listen for 'end' event and resolve the promise with an empty string if no data was received
      this.stream.on('end', endListener);

      // Listen for 'error' event and remove the listener after rejecting the promise
      this.stream.on('error', errorListener);
    });
  }

  /**
   * Generate a SHA1 hash.
   *
   * @returns A promise that resolves with the generated SHA1 hash as a hexadecimal string.
   */
  public generateSha1(): Promise<string> {
    return this.generateHash(Algorithms.SHA1);
  }

  /**
   * Generate a SHA256 hash.
   *
   * @returns A promise that resolves with the generated SHA256 hash as a hexadecimal string.
   */
  public generateSha256(): Promise<string> {
    return this.generateHash(Algorithms.SHA256);
  }

  /**
   * Generate a SHA384 hash.
   *
   * @returns A promise that resolves with the generated SHA384 hash as a hexadecimal string.
   */
  public generateSha384(): Promise<string> {
    return this.generateHash(Algorithms.SHA384);
  }

  /**
   * Generate a SHA512 hash.
   *
   * @returns A promise that resolves with the generated SHA512 hash as a hexadecimal string.
   */
  public generateSha512(): Promise<string> {
    return this.generateHash(Algorithms.SHA512);
  }

  /**
   * Generate an MD5 hash.
   *
   * @returns A promise that resolves with the generated MD5 hash as a hexadecimal string.
   */
  public generateMD5(): Promise<string> {
    return this.generateHash(Algorithms.MD5);
  }

  /**
   * Generate a RIPEMD160 hash.
   *
   * @returns A promise that resolves with the generated RIPEMD160 hash as a hexadecimal string.
   */
  public generateRipemd160(): Promise<string> {
    return this.generateHash(Algorithms.RIPEMD160);
  }
}

export default Hasher;
export {
  Algorithms,
  Algorithm,
};
