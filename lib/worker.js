module.exports = worker

const { noop } = require('./logger')

// Workers' transport to the coordinator
function worker ({ logger = noop() } = {}) {
  const EventEmitter = require('events')
  const events = new EventEmitter()

  process.on('message', messageHandler)

  function send (channel) {
    return data => {
      process.send({ channel, data })
    }
  }

  events.setLogger = newLogger => {
    logger = newLogger
  }

  events.shutdown = () => {
    process.removeAllListeners('message')
    events.removeAllListeners()
  }

  events.sendOnline = send('online')
  events.sendReady = send('ready')
  events.sendResult = send('result')
  events.sendDone = send('done')
  events.sendLog = send('log')

  function messageHandler ({ channel, data }) {
    try {
      logger.debug(`[transport.worker] data on channel '${channel}' from the coordinator`)
      switch (channel) {
        case 'ping':
          return events.sendOnline(data)
        case 'config':
        case 'task':
        case 'collect':
        case 'end':
          return events.emit(channel, data)
        default:
          logger.warn(`[transport.worker] unknown channel '${channel}'`)
      }
    } catch (error) {
      logger.error(`[transport.worker] error processing message on channel '${channel}' from the coordinator :`, error)
    }
  }

  return events
}
