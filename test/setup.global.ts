import { Instance, Server } from 'prool'
import { port } from './prool.js'

export default async function () {
  return Server.create({
    instance: Instance.tempo(),
    port,
  }).start()
}
