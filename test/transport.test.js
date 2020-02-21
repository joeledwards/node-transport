const tap = require('tap')
const { fork } = require('child_process')
const meter = require('@buzuli/meter')
const { coordinator, worker } = require('../lib')

const logger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {}
}

tap.test('lib/transport.coordinator has sender functions', async assert => {
  const transport = coordinator()

  assert.equal(typeof transport.sendConfig, 'function')
  assert.equal(typeof transport.sendPing, 'function')
  assert.equal(typeof transport.sendTask, 'function')
  assert.equal(typeof transport.sendCollect, 'function')
  assert.equal(typeof transport.sendEnd, 'function')

  assert.equal(typeof transport.setLogger, 'function')
  assert.equal(typeof transport.shutdown, 'function')

  transport.shutdown()
})

tap.test('lib/transport.worker has sender functions', async assert => {
  const transport = worker()

  assert.equal(typeof transport.sendOnline, 'function')
  assert.equal(typeof transport.sendReady, 'function')
  assert.equal(typeof transport.sendResult, 'function')
  assert.equal(typeof transport.sendLog, 'function')
  assert.equal(typeof transport.sendDone, 'function')

  assert.equal(typeof transport.setLogger, 'function')
  assert.equal(typeof transport.shutdown, 'function')

  transport.shutdown()
})

tap.test('lib/transport coordinator can manage multiple workers', async assert => {
  const transport = coordinator({ logger })

  const counts = meter()

  let tally = 0
  let total = 0
  let handled
  let done
  let result

  function resetHandle () {
    handled = new Promise(resolve => {
      done = resolve
    })
  }

  function handler (channel) {
    return data => {
      counts.add(channel)
      total++
      result = data
      done()
      resetHandle()
    }
  }

  resetHandle()

  transport.on('online', handler('online'))
  transport.on('ready', handler('ready'))
  transport.on('result', handler('result'))
  transport.on('done', handler('done'))
  transport.on('log', handler('log'))

  const workerChild1 = fork('./test/transport.worker', null, {})
  const workerChild2 = fork('./test/transport.worker', null, {})

  const worker1 = transport.addWorker(workerChild1)
  const worker2 = transport.addWorker(workerChild2)

  // Confirm workers report that they are online
  const offline = new Set()
  offline.add(worker1)
  offline.add(worker2)

  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('online'), 1)
  offline.delete(result.id)

  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('online'), 2)
  offline.delete(result.id)

  assert.equal(offline.size, 0, 'both workers should have reported in')

  // Confirm workers respond to pings and are correctly paired with
  // their IDs in the coordinator transport
  transport.sendPing(worker1, { yellow: 'sub' })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('online'), 3)
  assert.same(result, { id: worker1, data: { yellow: 'sub' } }, 'worker1 responds to ping')

  transport.sendPing(worker2, { yellow: 'sub' })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('online'), 4)
  assert.same(result, { id: worker2, data: { yellow: 'sub' } }, 'worker2 responds to ping')

  // Confirm that workers receive their configuration
  transport.sendConfig(worker1, { alias: `worker-${worker1}` })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('ready'), 1)
  assert.same(result, { id: worker1, data: { alias: `worker-${worker1}` } })

  transport.sendConfig(worker2, { alias: `worker-${worker2}` })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('ready'), 2)
  assert.same(result, { id: worker2, data: { alias: `worker-${worker2}` } })

  // Confirm that workers can send logs
  transport.sendTask(worker1, { chainsaw: true, todo: 'a' })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('log'), 1)
  assert.same(result, { id: worker1, data: { level: 'info', data: { chainsaw: true, todo: 'a' } } })

  transport.sendTask(worker2, { chainsaw: true, todo: 'b' })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('log'), 2)
  assert.same(result, { id: worker2, data: { level: 'info', data: { chainsaw: true, todo: 'b' } } })

  // Confirm that workers report ready and indicate result available
  transport.sendTask(worker1, { do: 'a' })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('ready'), 3)
  assert.same(result, { id: worker1, data: { result: true } })

  transport.sendTask(worker2, { do: 'b' })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('ready'), 4)
  assert.same(result, { id: worker2, data: { result: true } })

  // Confirm that workers can report completed tasks
  transport.sendCollect(worker1)
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('result'), 1)
  assert.same(result, { id: worker1, data: { do: 'a' } })

  transport.sendCollect(worker2)
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('result'), 2)
  assert.same(result, { id: worker2, data: { do: 'b' } })

  // Confirm that workers respond to the 'end' instruction
  transport.sendEnd(worker1, { message: `you are done ${worker1}` })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('done'), 1)
  assert.same(result, { id: worker1, data: { message: `you are done ${worker1}` } })

  transport.sendEnd(worker2, { message: `you are through ${worker2}` })
  await handled
  assert.equal(total, ++tally)
  assert.equal(counts.get('done'), 2)
  assert.same(result, { id: worker2, data: { message: `you are through ${worker2}` } })

  transport.shutdown()
})
