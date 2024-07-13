import { parseAll } from "./parser";
import path from 'path'
import { log } from './helpers/log'
import { GlobalConfig } from './render'
import { processWorkflow } from './workflow'

export const main = () => {
  log.info('Application Starting')

  require('dotenv').config()

  if (!process.env["NODE_CONFIG_DIR"]) {
    process.env["NODE_CONFIG_DIR"] = __dirname + '/../config/';
  }

  const c = require('config') as GlobalConfig

  // parse
  const all = parseAll(c.template_path, c.template?.versions || [], c.template?.specials || []);

  const enabled = c.enabled
  // validate
  // TODO

  // process workflow
  if (enabled && enabled.length) {
    enabled.forEach((name: string) => {
      log.info(`Processing group ${name}`)

      // render
      processWorkflow(name, all, c)
    })
  }

  log.info('Application Finished')
}

main()

