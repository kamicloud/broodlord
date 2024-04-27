import { parseAll } from "./parser";
import path from 'path'
import { log } from './helpers/log'
import { useLiquid } from './helpers/stub'
import { BaseRender, WorkflowConfig, GlobalConfig } from './render'
import { Stub } from './stub'
import { pushRenderPathsToList } from './helpers/workflow'

log.info('Application Starting')

require('dotenv').config()

if (!process.env["NODE_CONFIG_DIR"]) {
  process.env["NODE_CONFIG_DIR"] = __dirname + '/../config/';
}

const c = require('config') as GlobalConfig
const realRootPath = path.resolve(c.config?.output_root_path || '')
const liquidTemplatePath = path.resolve(c.config?.liquid_template_path || `${c.template_path}/../stubs`)

// parse
const all = parseAll(c.template_path, c.template?.versions || [], c.template?.specials || []);

const enabled = c.enabled
// validate
// TODO

const buildRendersByWorkflowConfig = (config: WorkflowConfig): { [key: string]: BaseRender } => {
  const rootPath = path.resolve(realRootPath, config.path)
  const filters = config.filters
  const liquid = useLiquid(liquidTemplatePath, filters)
  const renders: { [key: string]: BaseRender } = {}

  const list: string[] = []

  // regist basic renders
  pushRenderPathsToList(list, `${__dirname}/renders`)

  // regist custom render
  if (c.renders) {
    c.renders.forEach(renderPath => {
      pushRenderPathsToList(list, renderPath)
    })
  }

  list.forEach((path: string) => {
    const render = require(path).default

    const r: BaseRender = new render(rootPath, liquid)

    renders[r.name] = r
  })

  return renders
}

const processWorkflow = async (name: string, stubAll: Stub.All) => {
  const config = c?.workflows[name] || undefined

  if (!config) {
    log.info(`[${name}] render config is missing! Skipped.`)

    return
  }

  const pipelines = config.pipelines

  const renders = buildRendersByWorkflowConfig(config)

  // pipelines
  pipelines.forEach((pipeline) => {
    const render = renders[pipeline.type]

    if (!render) {

      return
    }

    render.process(stubAll, pipeline)
  })
}

// process workflow
if (enabled && enabled.length) {
  enabled.forEach((name: string) => {
    log.info(`Processing group ${name}`)

    // render
    processWorkflow(name, all)
  })
}

log.info('Application Finished')

