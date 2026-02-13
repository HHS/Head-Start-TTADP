import type { Readable } from 'stream'
import { SAXStream } from 'sax'
import { simplifyObject, detectAndCast } from '../dataObjectUtils'

interface SchemaNode {
  name?: string
  attributes?: Record<string, boolean> // Map attribute names to their optionality
  children?: Record<string, SchemaNode> // Map child element names to their schema nodes
  optional: boolean // Is the element optional?
  occurrences: number // Number of occurrences of the element
  type?: string // the type of value
}

/**
 * Recursively processes a schema tree, marking child nodes as optional if their occurrences
 * are less than their parent's occurrences.
 * It also removes the 'occurrences' attribute from each node after processing.
 *
 * @param schema - The schema node to process, which should conform to the SchemaNode interface.
 * @param parentOccurrences - The number of occurrences of the parent node, used to determine
 * if a child node should be marked as optional. If null, the current node is treated as
 * a root node.
 */
const processSchema = (schema: SchemaNode, parentOccurrences: number | null = null): void => {
  // check if the current object has children
  if (schema?.children && typeof schema.children === 'object') {
    // Iterate over each child
    Object.keys(schema.children).forEach((key) => {
      const child = schema.children[key]
      if (child) {
        // Remove the name attribute if it matches the key
        if (child.name === key) {
          delete child.name
        }
        // Remove the attributes object if it's empty
        if (child.attributes && Object.keys(child.attributes).length === 0) {
          delete child.attributes
        }
        // Compare occurrences and set optional if needed
        if (parentOccurrences !== null && child.occurrences !== undefined && child.occurrences < parentOccurrences) {
          child.optional = true
        }
        // Process the child object
        processSchema(child, schema.occurrences)
      }
    })
  }
  // After processing children, delete the occurrences attribute
  if (schema?.occurrences) {
    // eslint-disable-next-line no-param-reassign
    delete schema.occurrences
  }
}

class XMLStream {
  private readonly xmlStream: Readable

  private readonly saxStream: SAXStream

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parsedObjects: any[] = []

  private isFullyRead = false

  private schema: SchemaNode | null = null

  private schemaStack: SchemaNode[] = []

  /**
   * Constructs an instance of the class with a given XML stream.
   * It initializes the internal XML stream with the provided Readable stream
   * and creates a new SAX stream in strict mode.
   *
   * @param xmlStream - The Readable stream containing XML data to be processed.
   */
  constructor(
    xmlStream: Readable,
    private virtualRootNode = false
  ) {
    this.xmlStream = xmlStream
    this.saxStream = new SAXStream(
      false, // Enable strict mode
      {
        trim: true,
        lowercase: true,
      }
    )
  }

  /**
   * Initializes the parser by setting up event handlers for the SAX stream and
   * piping the input XML stream into it. It constructs a tree of objects
   * corresponding to the XML nodes and stores them in `this.parsedObjects`.
   * The method returns a promise that resolves when the XML stream has been
   * fully read and parsed, or rejects if an error occurs during parsing.
   *
   * @returns {Promise<void>} A promise that resolves with no value upon
   * successful completion of parsing, or rejects with an error if parsing fails.
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stack = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentObject = null

      // Set up the event handlers for the SAX stream
      this.saxStream.on('error', (err) => {
        // Handle errors
        reject(err)
      })

      // Listen for 'opentag' events from the saxStream
      this.saxStream.on('opentag', (node) => {
        // Skip processing if encountering a virtual root node without a defined schema
        if (this.virtualRootNode && !this.schema && node.name === 'root') {
          return
        }

        // Initialize a new object representing the current XML node
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newObj: any = { name: node.name, attributes: node.attributes, children: [] }

        // Add the new object as a child to the current object if it exists
        if (currentObject) {
          currentObject.children.push(newObj)
        }

        // Push the new object onto the stack and set it as the current object
        stack.push(newObj)
        currentObject = newObj

        // Initialize or retrieve the schema node for the current XML node
        let schemaNode: SchemaNode
        if (this.schemaStack.length === 0) {
          // If the schema stack is empty, initialize or use the root schema
          if (!this.schema) {
            this.schema = {
              name: node.name,
              attributes: {},
              optional: false,
              occurrences: 0,
            }
          }
          schemaNode = this.schema
        } else {
          // Retrieve the parent schema node to update or create the child schema node
          const parentSchemaNode = this.schemaStack[this.schemaStack.length - 1]
          if (!parentSchemaNode.children) {
            parentSchemaNode.children = {}
          }
          if (!parentSchemaNode.children[node.name]) {
            parentSchemaNode.children[node.name] = {
              name: node.name,
              attributes: {},
              optional: true,
              occurrences: 0,
            }
          }
          schemaNode = parentSchemaNode.children[node.name]
        }

        // Increment the occurrence count of the schema node
        schemaNode.occurrences += 1
        // If a node occurs more than once, it is no longer considered optional
        if (schemaNode.occurrences > 1) {
          schemaNode.optional = false
        }

        // Update the schema attributes to include attributes of the current node
        Object.keys(node.attributes).forEach((attrName) => {
          schemaNode.attributes[attrName] = true
        })

        // Push the current schema node onto the schema stack
        this.schemaStack.push(schemaNode)
      })

      this.saxStream.on('text', (text) => {
        // Add text content to the current object, if any
        if (currentObject && text.trim().length > 0) {
          currentObject.text = (currentObject.text || '') + text.trim()
        }
      })

      this.saxStream.on('closetag', (name: string) => {
        if (this.virtualRootNode && !currentObject && name === 'root') {
          // Ignore the virtual root node
          return
        }

        if (currentObject.text) {
          const { value, type } = detectAndCast(currentObject.text)
          currentObject.text = value
          const schemaNode = this.schemaStack[this.schemaStack.length - 1]
          schemaNode.type = type
        }
        // Pop the current object from the stack
        const completedObject = stack.pop()
        this.schemaStack.pop()
        // If the stack is empty, we've completed parsing the root element
        if (stack.length === 0) {
          this.parsedObjects.push(completedObject)
          currentObject = null
        } else {
          // Otherwise, set the current object to the parent object
          currentObject = stack[stack.length - 1]
        }
      })

      this.saxStream.on('end', () => {
        // Handle the end of the XML stream
        processSchema(this.schema)
        this.isFullyRead = true
        resolve()
      })

      // Pipe the input XML stream into the SAX stream
      this.xmlStream.pipe(this.saxStream)
      if (this.virtualRootNode) {
        this.xmlStream.push('<root>')
      }
    })
  }

  /**
   * Retrieves the count of parsed objects.
   *
   * @returns {number} The number of parsed objects contained within the instance.
   */
  getObjectCount(): number {
    return this.parsedObjects.length
  }

  /**
   * Checks if the processing has been completed by verifying if the resource has been fully read.
   *
   * @returns {boolean} A boolean value indicating whether the resource is fully read.
   */
  processingComplete(): boolean {
    return this.isFullyRead
  }

  /**
   * Asynchronously retrieves the next object from a collection of parsed objects.
   * If the end of the collection is reached and the stream is fully read, it returns null.
   * If the end of the collection is reached but the stream is not fully read, it waits
   * for more data to be read and parsed, then attempts to retrieve the next object again.
   *
   * @returns {Promise<any|null>} A promise that resolves to the next object in the collection,
   *                              or null if no more objects are available.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getNextObject(simplified = false): Promise<any | null> {
    if (!this.parsedObjects.length) {
      if (this.isFullyRead) {
        return null
      }

      // Wait for more data to be read and parsed
      return new Promise((resolve) => {
        this.saxStream.once('data', () => {
          resolve(this.getNextObject(simplified))
        })
      })
    }

    // Pop the last object from the array
    const object = this.parsedObjects.shift()
    return simplified ? simplifyObject(object, 'children', 'text') : object
  }

  /**
   * Retrieves the JSON schema of the first parsed object.
   *
   * This method returns a promise that resolves to a string. If there are already parsed objects,
   * it immediately resolves with the schema of the first one. If no objects have been parsed yet
   * and the reading is complete, it resolves to an empty string. Otherwise, it waits for the first
   * object to be read and parsed, then resolves with its schema.
   *
   * @returns {Promise<string>} A promise that resolves to the JSON schema of the first parsed
   * object, or an empty string if no objects are available and reading is complete.
   */
  async getObjectSchema(): Promise<SchemaNode> {
    // Check if the stream has been fully read
    if (this.isFullyRead) {
      // If the stream is fully read, return the schema immediately
      return this.schema
    }

    // If the stream is not fully read, wait for the 'end' event
    return new Promise<SchemaNode>((resolve) => {
      this.saxStream.on('end', () => {
        // Once the stream ends, resolve the promise with the schema
        resolve(this.schema)
      })
    })
  }
}

export default XMLStream
export type { SchemaNode }
