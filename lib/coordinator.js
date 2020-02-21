module.exports = coordinator

const { noop } = require('./logger')

// Coordinator's transport to the workers
function coordinator ({ logger = noop() } = {}) {
  const EventEmitter = require('events')
  const events = new EventEmitter()
  let lastWorkerId = 0
  const workers = new Map()

  events.addWorker = worker => {
    const workerId = ++lastWorkerId
    workers.set(workerId, worker)
    worker.on('message', messageHandler(workerId))
    return workerId
  }

  events.removeWorker = workerId => {
    const worker = workers.get(workerId)
    if (worker) {
      worker.removeAllListeners('message')
      workers.delete(workerId)
    }
    return worker
  }

  events.setLogger = newLogger => {
    logger = newLogger
  }

  events.shutdown = () => {
    for (const workerId of workers.keys()) {
      events.removeWorker(workerId)
    }
    events.removeAllListeners()
  }

  function send (channel) {
    return (workerId, data) => {
      const worker = workers.get(workerId)
      if (worker) {
        worker.send({ channel, data })
      } else {
        logger.warn(`[transport.coordinator] unknown worker id: ${workerId}`)
      }
    }
  }

  events.sendConfig = send('config')
  events.sendPing = send('ping')
  events.sendTask = send('task')
  events.sendCollect = send('collect')
  events.sendEnd = send('end')

  function messageHandler (workerId) {
    return ({ channel, data }) => {
      try {
        logger.debug(`[transport.coordinator] data on channel '${channel}' from worker ${workerId}`)
        switch (channel) {
          case 'online':
          case 'ready':
          case 'result':
          case 'done':
          case 'log':
            return events.emit(channel, { id: workerId, data })
          default:
            logger.warn(`[transport.coordinator] unknown channel '${channel}' from worker ${workerId}`)
        }
      } catch (error) {
        logger.error(`[transport.coordinator] error processing message on channel '${channel}' from worker ${workerId} :`, error)
      }
    }
  }

  return events
}
