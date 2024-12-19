#!/usr/bin/env ts-node

import { log } from './helpers/log'
import {ParserConfig} from './parser';
import {RenderConfig} from './render'
import { processWorkflow, parseAll } from './workflow'

export const main = () => {
  log.info('Application Starting')

  require('dotenv').config()

  if (!process.env.NODE_CONFIG_DIR) {
    process.env.NODE_CONFIG_DIR = __dirname + '/../config/';
  }

  const c = require('config') as ParserConfig & RenderConfig

  // parse
  const all = parseAll(c as ParserConfig);

  const enabled = c.enabled
  // validate
  // TODO

  // process workflow
  if (enabled && enabled.length) {
    enabled.forEach((name: string) => {
      log.info(`Processing group ${name}`)

      // render
      processWorkflow(name, all, c as RenderConfig)
    })
  }

  log.info('Application Finished')
}

main()

