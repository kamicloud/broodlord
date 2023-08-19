import { parseAll } from "./parser";
import path from 'path'
import { log } from './helpers/log'
import { useLiquid } from './helpers/stub'
import { Stub, Config, BaseRender } from './render'

log.info('Application Starting')

require('dotenv').config()

if (!process.env["NODE_CONFIG_DIR"]) {
  process.env["NODE_CONFIG_DIR"] = __dirname + '/../config/';
}

const config = require('config');

const all = parseAll(config.template_path, config.template?.versions || [], config.template?.specials || []);

const enabled = config.enabled

const render = async (name: string, stubAll: Stub.All) => {
  const c = require('config')

  const realRootPath = path.resolve(c.config?.output_root_path || '')
  const liquidTemplatePath = path.resolve(c.config?.liquid_template_path || `${c.template_path}/../stubs`)

  const config = c.get(name) as Config

  const rootPath = path.resolve(realRootPath, config.path)
  const pipelines = config.pipelines
  const filters = config.filters

  const renders: { [key: string]: BaseRender } = {}
  const liquid = useLiquid(liquidTemplatePath, filters)

  const registerRender = (render: any) => {
    const r = new render(rootPath, liquid)

    renders[r.name] = r
  }

  registerRender(require(__dirname + '/renders/render-ast').default)
  registerRender(require(__dirname + '/renders/render-liquid').default)
  registerRender(require(__dirname + '/renders/render-openapi').default)
  registerRender(require(__dirname + '/renders/render-postman').default)
  registerRender(require(__dirname + '/renders/render-remove').default)

  // pipelines
  pipelines.forEach((pipeline) => {
    const render = renders[pipeline.type]

    if (!render) {

      return
    }

    render.process(stubAll, pipeline)
  })
}

if (enabled && enabled.length) {
  enabled.forEach((name: string) => {
    log.info(`Processing group ${name}`)

    render(name, all)
  })
}

log.info('Application Finished')
