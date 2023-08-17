import { Liquid } from "liquidjs";
import path from 'path'
import _ from "lodash";
import fs from './helpers/fs'
import { getContextsBySource, useLiquid, LiquidFilters } from './helpers/stub'

export default async (name: string, stubAll: Stub.All) => {
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

export abstract class BaseRender {
  public name = ''
  readonly liquid: Liquid
  readonly rootPath: string
  readonly allowedSource: AllowedSource | null = null
  readonly fs = fs

  constructor(rootPath: string, liquid: Liquid) {
    this.rootPath = rootPath
    this.liquid = liquid
  }

  readonly process = (stubAll: Stub.All, pipeline: Pipeline) => {
    const contexts = getContextsBySource(
      stubAll,
      this.allowedSource ? this.allowedSource : pipeline.source,
      this.rootPath,
      pipeline
    )

    for (const ctx of contexts) {
      if (!this.assertConfig(ctx, pipeline)) {
        continue
      }

      this.render(ctx, pipeline)
    }
  }

  abstract assertConfig(ctx: RenderContext, pipeline: Pipeline): boolean
  abstract render(ctx: RenderContext, pipeline: Pipeline): void
}

export interface RenderContext {
  path: string,
  all: Stub.All,
  template?: Stub.Template,
  controller?: Stub.Controller,
  action?: Stub.Action,
  model?: Stub.Model,
  enum?: Stub.Enum,
  pipeline: Pipeline,
}

interface Config {
  path: string
  pipelines: Pipeline[]
  filters: LiquidFilters
}

export interface Pipeline {
  type: string
  source: AllowedSource | null
  special: string | null
  enable: string | null
}

export enum AllowedSource {
  all = 'all',
  tempate = 'template',
  model = 'model',
  controller = 'controller',
  action = 'action',
  enum = 'enum',
  constant = 'constant',
}

export namespace Stub {
  export type Annotations = { [key: string]: any }

  export class Base {
    public comment: string[] = []
  }

  export class All extends Base {
    public templates: Stub.Template[] = []
    public specials: { [key: string]: Stub.Template } = {}
  }

  class Named extends Base {
    public name: string

    constructor(name: string) {
      super()

      this.name = name
    }
  }

  export class Template extends Named {
    public enums: Stub.Enum[] = []
    public models: Stub.Model[] = []
    public controllers: Stub.Controller[] = []
  }

  class NamedWithAnnotation extends Named {
    public annotation: Stub.Annotations = {}
  }

  export class Enum extends NamedWithAnnotation {
    items: EnumItem[] = []
  }

  export class EnumItem extends NamedWithAnnotation {
    value: string = ''
  }

  export class Controller extends NamedWithAnnotation {
    actions: Stub.Action[] = []
  }

  export class Action extends NamedWithAnnotation {
    extends: string | null = null
    requests: Stub.Parameter[] = []
    responses: Stub.Parameter[] = []
  }

  export class Model extends NamedWithAnnotation {
    parameters: any[] = []
    extends: string | null = null
  }

  export class Parameter extends NamedWithAnnotation {
    nullable: boolean = false
    type: string = ''
    is_array: boolean = false
    is_model: boolean = false
    is_enum: boolean = false
  }
}
