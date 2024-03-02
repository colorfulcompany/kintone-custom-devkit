class EnvironmentVariableNotDefined extends Error {
  static name = 'EnvironmentVariableNotDefined'
}

/**
 * @param {object} env
 * @param {string} name
 * @returns {any}
 */
function getEnv (env, name) {
  if (Object.hasOwn(env, name)) {
    return env[name]
  } else {
    throw new EnvironmentVariableNotDefined(name)
  }
}

/**
 * @param {string} message
 * @returns {string}
 */
function formatLog (message) {
  const d = new Date()

  return `[KintonDevProxy][${[d.toISOString().split('T')[0], d.toLocaleTimeString()].join(' ')}] ${message}`
}

module.exports = {
  getEnv,
  formatLog
}
