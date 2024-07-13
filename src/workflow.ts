import fs from 'node:fs'
import path from 'node:path'
import { Stub } from './stub'
import { BaseRender, GlobalConfig, WorkflowConfig } from './render'
import { log } from './helpers/log'
import { useLiquid } from './helpers/stub'

export const pushRenderPathsToList = (list: string[], renderPath: string) => {
  const customRenderFiles = fs.readdirSync(renderPath)

  customRenderFiles.forEach((customRenderFile: string) => {
    if (!customRenderFile.startsWith('render-') || !customRenderFile.endsWith('.ts')) {
      return
    }

    const customRenderPath = path.resolve(renderPath, customRenderFile)

    const customRender = require(customRenderPath)

    if (!customRender || !customRender.default) {
      return
    }

    list.push(customRenderPath)
  })
}

export const processWorkflow = async (name: string, stubAll: Stub.All, c: GlobalConfig) => {
  const config = c?.workflows[name] || undefined

  if (!config) {
    log.info(`[${name}] render config is missing! Skipped.`)

    return
  }

  const pipelines = config.pipelines

  const renders = buildRendersByWorkflowConfig(config, c)

  // pipelines
  pipelines.forEach((pipeline) => {
    const render = renders[pipeline.type]

    if (!render) {

      return
    }

    render.process(stubAll, pipeline)
  })
}

export const buildRendersByWorkflowConfig = (config: WorkflowConfig, c: GlobalConfig): { [key: string]: BaseRender } => {
  const realRootPath = path.resolve(c.config?.output_root_path || '')
  const liquidTemplatePath = path.resolve(c.config?.liquid_template_path || `${c.template_path}/../stubs`)

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
