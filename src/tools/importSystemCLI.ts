import importSystem from './importSystem'
import { auditLogger } from '../logger'

// Get the first and second arguments
const action = process.argv[2]
const importId = process.argv[3]
const timeBox = process.argv[4]

// Check if both arguments are provided
if (action && importId) {
  // Call the function with the argument
  importSystem(action, importId, timeBox)
    .then(() => process.exit())
    .catch((e) => {
      auditLogger.error(e)
      process.exit(1)
    })
} else {
  auditLogger.error('Please provide an arguments.')
  process.exit(1) // Exit with a failure code
}
