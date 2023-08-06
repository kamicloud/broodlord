import {parseAll} from "./parser";
import render from "./render";
import { log } from './helpers/log'

log.info('Application Starting')

require('dotenv').config()

if (!process.env["NODE_CONFIG_DIR"]) {
  process.env["NODE_CONFIG_DIR"] = __dirname + '/../config/';
}

const config = require("config");

const all = parseAll(config.template_path, config.template.versions, config.template.specials);

const enabled = config.get('enabled')

if (enabled && enabled.length) {
  enabled.forEach((name: string) => {
    log.info(`Processing group ${name}`)

    render(name, all)
  })
}

log.info('Application Finished')
