# transport

Transport system for use by parent and child processes forked via `child_process.fork()`.

## transport.coordinator

Creates a transport for a coordinator (parent process) to direct its workers (child processes).

`transport.coordinator(options)`
- `options.logger`: `object` = `console` | The logger which this coordinator tranport should use.

Returns `{ addWorker, removeWorker, setLogger, shutdown, sendConfig, sendPing, sendTask, sendCollect, sendEnd } extends EventEmitter`:
- `addWorker`: `(proc) => id` | Adds a worker process handle to the transport and returns the generated worker ID.
- `removeWorker`: `(id) => proc` | Removes and returns the identified worker if found.
- `setLogger`: `(logger) => nil` | Replaces the transport's logger.
- `shutdown`: `() => nil` | Removes all listeners and handlers (permit the process to exit cleanly).
- `sendConfig`: `(id, config) => nil` | Sends a config object to a worker (should happen after the `online` event).
- `sendPing`: `(id) => nil` | Pings a worker (response event is `online`).
- `sendTask`: `(id, task) => nil` | Sends a task object to a worker.
- `sendCollect`: `(id) => nil` | Sends a collect request to a worker.
- `sendEnd`: `(id) => nil` | Directs a worker to halt.

Events:
- `online` | A worker has started and its transport is online. Is also emitted in response to a `ping`.
- `ready` | A worker is ready to receive a task (should be after config has been received and all initialization work is completed).
- `result` | A worker has sent result data (should be emitted in response to a coordinator's `collect` request).
- `done` | A worker is halting and will not respond to any futher communication. The worker should be removed from this transport.
- `log` | Should be used to transmit log data to the coordinator.

All events emit `{ id, data? }`:
- `id`: `number` | The ID of the worker which emitted the event.
- `data`: `object` | The payload associated with the event (should be present in `result` and `log` events).

## transport.worker

Creates a transport for a worker (child process) to receive instruction from its coordinator (parent process).

`transport.worker(options)`
- `options.logger`: `object` = `console` | The logger which this worker transport should use.

Returns `{ setLogger, shutdown, sendOnline, sendReady, sendResult, sendDone, sendLog } extends EventEmitter`:
- `setLogger`: `(logger) => nil` | Replaces the transport's logger.
- `shutdown`: `() => nil` | Removes all listeners and handlers (permit the process to exit cleanly).
- `sendOnline`: `(data?) => nil` | Indicate that this worker's transport is active.
- `sendReady`: `(data?) => nil` | Indicate that this worker is ready to receive a task (typically on completion of the prior task).
- `sendResult`: `(data) => nil` | Send a result to the coordinator (should be in response to a `collect` event).
- `sendDone`: `(data?) => nil` | Indicate that this worker is halting and will not respond to any further communcation from the coordinator.
- `sendLog`: `(data) => nil` | Sends a log record to the the coordinator.

Events:
- `config` | The coordinator has sent configuration.
- `task` | The coordinator has assigned a new task to this worker.
- `collect` | The coordinator has requested that the worker deliver any cached results.
- `end` | The coordinator has requested that the worker halt.

Some events emit a data field:
- `data`: `object` | The payload associated with the event (should be present in `config` and `task` events).

## transport.run

Runs an action, with configurable handling of the outcome.

`transport.run(action, options)`
- `action`: `() => Promise | any` | The function which should be run and awaited.
- `options.logger`: `object` = `console` | The logger to which errors should be sent.
- `options.rethrow`: `boolean` = `true` | Rethrow if an exception is caught while awaiting `action()`.

Returns a promise which indicates the outcome of the `action()` function.

