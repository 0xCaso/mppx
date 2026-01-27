import * as http from 'node:http'

export async function createServer(
  handleRequest: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>,
) {
  const server = http.createServer(handleRequest)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as { port: number }
  return Object.assign(server, { port, url: `http://localhost:${port}` })
}
