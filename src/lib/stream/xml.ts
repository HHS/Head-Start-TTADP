import { Readable } from 'stream';
import { SAXParser } from 'sax';

class XMLStream {
  private readonly xmlStream: Readable;

  private parsedObjects: any[] = [];

  private currentIndex = 0;

  private isFullyRead = false;

  constructor(xmlStream: Readable) {
    this.xmlStream = xmlStream;
  }

  /**
   * Initializes the XMLStream by parsing the XML data from the provided stream.
   * @returns A promise that resolves when the initialization is complete.
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const saxParser = new SAXParser(true); // Enable strict mode

      saxParser.onerror = (err) => {
        reject(err);
      };

      saxParser.onopentag = (node) => {
        if (node.name === 'objects') {
          this.parsedObjects = [];
        }
      };

      saxParser.ontext = (text) => {
        // Process text content here
        // For example, you can push the parsed object into an array
        // or perform any other necessary operations
        const parsedObject = JSON.parse(text);
        this.parsedObjects.push(parsedObject);
      };

      saxParser.onend = () => {
        resolve();
      };

      this.xmlStream.pipe(saxParser);
    });
  }

  /**
   * Returns the number of parsed objects.
   * @returns The count of parsed objects.
   */
  getObjectCount(): number {
    return this.parsedObjects.length;
  }

  /**
   * Checks if all objects have been processed.
   * @returns True if all objects have been processed, otherwise false.
   */
  processingComplete(): boolean {
    return this.isFullyRead;
  }

  /**
   * Retrieves the next parsed object from the XML stream.
   * @returns A promise that resolves with the next parsed object, or null if all objects
   * have been retrieved.
   */
  getNextObject(): Promise<any | null> {
    return new Promise((resolve) => {
      if (this.currentIndex >= this.parsedObjects.length && this.isFullyRead) {
        resolve(null);
      } else if (this.currentIndex < this.parsedObjects.length) {
        const object = this.parsedObjects[this.currentIndex];
        // eslint-disable-next-line no-plusplus
        this.currentIndex++;
        resolve(object);
      } else {
        this.xmlStream.once('readable', () => {
          this.getNextObject().then(resolve);
        });
        this.xmlStream.on('end', () => {
          this.isFullyRead = true;
        });
      }
    });
  }

  /**
   * Retrieves the JSON schema of the first parsed object.
   * @returns A promise that resolves with the JSON schema as a string, or an empty string
   * if no objects have been parsed yet.
   */
  getObjectSchema(): Promise<string> {
    return new Promise((resolve) => {
      if (this.parsedObjects.length > 0) {
        resolve(JSON.stringify(this.parsedObjects[0]));
      } else {
        this.xmlStream.once('readable', () => {
          this.getObjectSchema().then(resolve);
        });
        this.xmlStream.on('end', () => {
          resolve('');
        });
      }
    });
  }
}

export default XMLStream;
