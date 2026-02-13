import * as crypto from 'crypto'
import { Readable, PassThrough } from 'stream'

// Define an object that maps algorithm names to their corresponding string values
const Algorithms = {
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA384: 'sha384',
  SHA512: 'sha512',
  MD5: 'md5',
  RIPEMD160: 'ripemd160',
}

// Create a type alias for the values of the Algorithms object
type Algorithm = (typeof Algorithms)[keyof typeof Algorithms]

class Hasher extends PassThrough {
  private hash: crypto.Hash

  private hashPromise: Promise<string>

  private resolveHash: (hash: string) => void

  private rejectHash: (error: Error) => void

  constructor(algorithm: Algorithm = Algorithms.SHA256) {
    super()
    this.hash = crypto.createHash(algorithm)

    // Initialize the hash promise and its resolver/rejector functions
    this.hashPromise = new Promise<string>((resolve, reject) => {
      this.resolveHash = resolve
      this.rejectHash = reject
    })

    this.on('data', (chunk) => {
      this.hash.update(chunk)
    })

    this.on('end', () => {
      // Finalize the hash when the stream ends and resolve the promise
      this.resolveHash(this.hash.digest('hex'))
    })

    this.on('error', (err) => {
      // Reject the promise if an error occurs in the stream
      this.rejectHash(err)
    })
  }

  public getHash(): Promise<string> {
    return this.hashPromise
  }
}

const getHash = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: string | Record<string, any>,
  algorithm: Algorithm = Algorithms.SHA256
) => {
  const inputData = typeof data === 'string' ? Buffer.from(data) : Buffer.from(JSON.stringify(data))
  const hash = crypto.createHash(algorithm)
  hash.update(inputData)
  return hash.digest('hex')
}

export default Hasher
export { Algorithms, type Algorithm, getHash }

// // Usage example:
// import fs from 'fs';

// const hasher = new Hasher(Algorithms.SHA256);
// const readStream = fs.createReadStream('some-file.txt');
// const writeStream = fs.createWriteStream('some-file-copy.txt');

// readStream.pipe(hasher).pipe(writeStream).on('finish', () => {
//   console.log('File has been copied and hashed');
//   hasher.getHash().then((hash) => {
//     console.log('Hash:', hash);
//   }).catch((error) => {
//     console.error('Error generating hash:', error);
//   });
// });
