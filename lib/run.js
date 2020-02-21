module.exports = run

async function run (action, options = {}) {
  const {
    logger = console,
    rethrow = true
  } = options

  try {
    const result = await action()
    return result
  } catch (error) {
    if (logger && (typeof logger.error === 'function')) {
      logger.error('Error running action:', error)
    }
    if (rethrow) {
      throw error
    }
  }
}
