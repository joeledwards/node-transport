module.exports = {
  noop
}

function noop (handlers = {}) {
  const ignore = () => {}

  const {
    error = ignore,
    warn = ignore,
    info = ignore,
    debug = ignore
  } = handlers

  return { error, warn, info, debug }
}
