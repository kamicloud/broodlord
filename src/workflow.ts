import fs from 'node:fs'
import path from 'node:path'
import { Stub } from './stub'
import {BaseParser, ParserConfig, TemplateConfig} from './parser';
import {BaseRender, RenderConfig, WorkflowConfig} from './render'
import { log } from './helpers/log'
import { useLiquid } from './helpers/stub'
import _ from 'lodash';

export const parseAll = (c: ParserConfig) => {
  const parsers = buildParsersByParserConfig(c)

  const all = new Stub.All()

  const templates = normalizeTemplateConfig(c.template?.versions)
  const specials = normalizeTemplateConfig(c.template?.specials)

  templates.forEach(template => {
    const parser = parsers[template.type || 'broodlord']

    if (!parser) {
      return
    }

    all.templates.push(parser.parse(template))
  })

  specials.forEach(special => {
    const parser = parsers[special.type || 'broodlord']

    if (!parser) {
      return
    }

    all.specials[special.name] = parser.parse(special)
  })


  return all
}

const normalizeTemplateConfig = (templateConfigs: (string | TemplateConfig)[] | null): TemplateConfig[] => {
  if (!templateConfigs) {
    return []
  }

  return templateConfigs.map((templateConfig) => {
    if (_.isString(templateConfig)) {
      return {
        name: templateConfig,
      }
    }

    const path = templateConfig.path

    return {
      ...templateConfig,
      path: path ? (_.isString(path) ? [path] : path) : undefined
    }
  })
}

export const pushTypescriptFilePathsToList = (list: string[], folder: string, prefix: 'parser' | 'render') => {
  const customRenderFiles = fs.readdirSync(folder)

  customRenderFiles.forEach((filename: string) => {
    if (!filename.startsWith(`${prefix}-`) || !filename.endsWith('.ts')) {
      log.info(`[${filename}] is not a parser file. Skipped.`)

      return
    }

    const customerClassPath = path.resolve(folder, filename)

    const customClass = require(customerClassPath)

    if (!customClass || !customClass.default) {
      log.info(`[${filename}] is not a valid parser file. Skipped.`)

      return
    }

    log.debug(`Found ${prefix}: ${customerClassPath}`)

    list.push(customerClassPath)
  })
}

export const processWorkflow = async (name: string, stubAll: Stub.All, c: RenderConfig) => {
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
      log.info(`[${name}] render ${pipeline.type} is missing! Skipped.`)

      return
    }

    render.process(stubAll, pipeline)
  })
}

export const buildParsersByParserConfig = (c: ParserConfig): {[key: string]: BaseParser} => {
  const parsers: {[key: string]: BaseParser} = {}

  const list: string[] = []

  pushTypescriptFilePathsToList(list, `${__dirname}/parsers`, 'parser')

  // regist custom parser
  if (c.parsers) {
    c.parsers.forEach(parserPath => {
      pushTypescriptFilePathsToList(list, parserPath, 'parser')
    })
  }

  list.forEach((path: string) => {
    const parser = require(path).default

    const r: BaseParser = new parser(c)

    parsers[r.name] = r
  })

  return parsers
}

export const buildRendersByWorkflowConfig = (config: WorkflowConfig, c: RenderConfig): { [key: string]: BaseRender } => {
  const realRootPath = path.resolve(c.config?.output_root_path || '')
  const liquidTemplatePath = path.resolve(c.config?.liquid_template_path || `${c.template_path}/../stubs`)

  const rootPath = path.resolve(realRootPath, config.path)
  const filters = config.filters
  const liquid = useLiquid(liquidTemplatePath, filters)
  const renders: { [key: string]: BaseRender } = {}

  const list: string[] = []

  // regist basic renders
  pushTypescriptFilePathsToList(list, `${__dirname}/renders`, 'render')

  // regist custom render
  if (c.renders) {
    c.renders.forEach(renderPath => {
      pushTypescriptFilePathsToList(list, renderPath, 'render')
    })
  }

  list.forEach((path: string) => {
    const render = require(path).default

    const r: BaseRender = new render(rootPath, liquid)

    renders[r.name] = r
  })

  return renders
}
