const { run, worker } = require('../lib')

run(async () => {
  const logger = {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {}
  }

  return new Promise(resolve => {
    const transport = worker({ logger })
    let result = {}

    transport.on('config', data => {
      transport.sendReady(data)
    })

    transport.on('task', data => {
      if (data.chainsaw === true) {
        transport.sendLog({ level: 'info', data })
      } else {
        result = data
        transport.sendReady({ result: true })
      }
    })

    transport.on('collect', data => {
      transport.sendResult(result)
      result = {}
    })

    transport.on('end', data => {
      transport.sendDone(data)
      transport.shutdown()
      resolve()
    })

    transport.sendOnline()
  })
})
