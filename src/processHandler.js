import { auditLogger } from './logger'
import { sequelize, descriptiveDetails, isConnectionOpen } from './models'
import { closeAllQueues } from './lib/queue'

let isShuttingDown = false // To prevent multiple shutdown attempts

export const resetShutDownFlag = () => {
  isShuttingDown = false
}

export const gracefulShutdown = async (msg) => {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true

  const details = JSON.stringify(descriptiveDetails())
  try {
    await closeAllQueues(msg)
  } catch (err) {
    auditLogger.error(`Error during queue shutdown through ${msg}: ${err}`)
  }
  if (isConnectionOpen()) {
    try {
      await sequelize.close()
      auditLogger.info(`Sequelize disconnected through ${msg}: ${details}`)
    } catch (err) {
      auditLogger.error(`Error during Sequelize disconnection through ${msg}: ${details}: ${err}`)
    }
  } else {
    auditLogger.info(`Sequelize already disconnected through ${msg}: ${details}`)
  }
}

export const formatLogObject = (logObject) => ({
  message: logObject.message,
  name: logObject.name,
  stack: logObject.stack,
  ...logObject,
})

export const registerEventListener = () => {
  // Listen for _fatalException
  process.on('_fatalException', async (err) => {
    auditLogger.error('Fatal exception', formatLogObject(err))
    await gracefulShutdown('fatal exception')
    process.exit(1)
  })

  // Listen for uncaught exceptions
  process.on('uncaughtException', async (err) => {
    auditLogger.error('Uncaught exception', formatLogObject(err))
    await gracefulShutdown('uncaught exception')
    process.exit(1)
  })

  // Listen for unhandled rejection
  process.on('unhandledRejection', async (reason, promise) => {
    auditLogger.error(`Unhandled rejection at: ${promise} reason: ${reason}`)

    if (process.env.CI) {
      if (reason instanceof Error) {
        if (reason.message.toLowerCase().includes('maxretriesperrequest')) {
          return
        }
        auditLogger.error('Uncaught rejection', formatLogObject(reason))
      }
    }

    await gracefulShutdown('app termination (unhandledRejection)')
    process.exit(1)
  })

  // Listen for SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    auditLogger.error('Received SIGINT')
    await gracefulShutdown('app termination (SIGINT)')
    process.exit(0)
  })

  // Listen for SIGTERM (e.g., kill command)
  process.on('SIGTERM', async () => {
    auditLogger.error('Received SIGTERM')
    await gracefulShutdown('app termination (SIGTERM)')
    process.exit(0)
  })

  // Listen for SIGUSR1
  process.on('SIGUSR1', async () => {
    auditLogger.error('Received SIGUSR1')
    await gracefulShutdown('app termination (SIGUSR1)')
    process.exit(0) // Handle user-defined signal 1
  })

  // Listen for SIGUSR2
  process.on('SIGUSR2', async () => {
    auditLogger.error('Received SIGUSR2')
    await gracefulShutdown('app termination (SIGUSR2)')
    process.exit(0) // Handle user-defined signal 2
  })

  // Listen for SIGQUIT
  process.on('SIGQUIT', async () => {
    auditLogger.error('Received SIGQUIT')
    await gracefulShutdown('app termination (SIGQUIT)')
    process.exit(0) // Or perform graceful shutdown
  })

  // Listen for SIGHUP
  process.on('SIGHUP', async () => {
    auditLogger.error('Received SIGHUP')
    await gracefulShutdown('app termination (SIGHUP)')
    process.exit(0) // Reload configuration or perform appropriate action
  })

  // Listen for warning events
  process.on('warning', (warning) => {
    auditLogger.warn('Warning:', formatLogObject(warning))
  })

  // Listen for rejectionHandled events
  process.on('rejectionHandled', (promise) => {
    auditLogger.info('A previously unhandled promise rejection was handled:', promise)
  })

  // Listen for exit event as a fallback
  process.on('exit', async (code) => {
    auditLogger.info(`About to exit with code: ${code}`)
    // If not already handled, you might want to ensure any remaining cleanup
    // is performed here. This is a last resort.
    await gracefulShutdown(`app termination (exit event) with code ${code}`)
  })
}
