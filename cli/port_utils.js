import { createServer } from 'net'

/**
 * @param {number} port
 * @param {string} [host='localhost']
 * @returns {Promise<boolean>}
 */
export function isPortAvailable(port, host = 'localhost') {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

/**
 * @param {number} preferredPort
 * @param {string} [host='localhost']
 * @param {number} [maxAttempts=100]
 * @returns {Promise<number>}
 */
export async function findAvailablePort(preferredPort, host = 'localhost', maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferredPort + i
    if (await isPortAvailable(port, host)) return port
  }
  throw new Error(`No available port found starting from ${preferredPort}`)
}

/**
 * @param {number[]} preferredPorts
 * @param {string} [host='localhost']
 * @returns {Promise<number[]>}
 */
export async function findAvailablePorts(preferredPorts, host = 'localhost') {
  const claimed = new Set()
  const result = []

  for (const preferred of preferredPorts) {
    let port = preferred
    while (claimed.has(port) || !(await isPortAvailable(port, host))) {
      port++
      if (port > preferred + 200) {
        throw new Error(`No available port found near ${preferred}`)
      }
    }
    claimed.add(port)
    result.push(port)
  }

  return result
}
