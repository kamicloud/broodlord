import { Liquid } from "liquidjs";
import path from 'path'
import _ from "lodash";
import fs from 'fs'

export default async (name: string, stubAll: Stub.All) => {
  const c = require('config')

  const realRootPath = c.get('config.root_path')
  const liquidTemplatePath = c.get('config.liquid_template_path')

  if (!liquidTemplatePath) {
    throw new Error('Please set config.liquid_template_path!')
  }

  const engine = getEngine(liquidTemplatePath)
  const config = c.get(name) as Config

  const rootPath = path.resolve(realRootPath ? path.resolve(realRootPath) : '', config.path)
  const pipelines = config.pipelines
  const filters = config.filters

  const renders: { [key: string]: BaseRender } = {}

  // bind filters
  for (const filterName in filters) {
    engine.registerFilter(filterName, (value: string) => {
      for (const key in filters[filterName]) {
        if (value === key) {
          return filters[filterName][key]
        }
      }

      return value
    })
  }

  const registerRender = (render: any) => {
    const r = new render(rootPath, engine)

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
  public engine: Liquid
  public rootPath: string
  public allowedSource: AllowedSource | null = null
  public fs = {
    rm(target: string) {
      fs.rmSync(target, {
        force: true,
        recursive: true
      })
    },
    writeFile(target: string, data: string) {
      fs.mkdirSync(path.dirname(target), {
        recursive: true
      })

      fs.writeFileSync(target, data, {
        flag: 'w+'
      })
    }
  }

  constructor(rootPath: string, engine: Liquid) {
    this.rootPath = rootPath
    this.engine = engine
  }

  process(stubAll: Stub.All, pipeline: Pipeline) {
    const contexts = getContextsBySource(
      stubAll,
      this.allowedSource ? this.allowedSource : pipeline.source,
      this.rootPath,
      pipeline.enable,
      pipeline.special
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
}

export const getContextsBySource = (
  stubAll: Stub.All,
  source: string | null,
  path: string,
  enable: string | null,
  special: string | null
): RenderContext[] => {
  const specialTemplate = special ? stubAll.specials[special] : null

  if (source === AllowedSource.tempate) {
    if (special && specialTemplate) {
      return [{
        path,
        all: stubAll,
        template: specialTemplate
      }]
    }

    return stubAll.templates.map(template => {
      return {
        path,
        all: stubAll,
        template,
      }
    })
  }

  if (source === AllowedSource.model) {
    if (special && specialTemplate) {
      return specialTemplate.models.map(model => {
        return {
          path,
          all: stubAll,
          template: specialTemplate,
          model,
        }
      })
    }

    const res: RenderContext[] = []

    stubAll.templates.forEach(template => {
      template.models.forEach(model => {
        if (enable && !model.annotation[enable]) {
          return
        }

        res.push({
          path,
          all: stubAll,
          template,
          model,
        })
      })
    })

    return res
  }

  if (source === AllowedSource.controller) {
    if (special && specialTemplate) {
      return specialTemplate.controllers.map(controller => {
        return {
          path,
          all: stubAll,
          template: specialTemplate,
          controller,
        }
      })
    }
  }

  if (source === AllowedSource.action) {
    if (special && specialTemplate) {
      const res: RenderContext[] = []

      specialTemplate.controllers.forEach(controller => {
        controller.actions.forEach(action => {
          res.push({
            path,
            all: stubAll,
            template: specialTemplate,
            controller,
            action,
          })
        })
      })

      return res
    }
  }

  return [{
    path,
    all: stubAll,
  }]
}

const getEngine = (liquidTemplatePath: string) => {
  const liquid = new Liquid({
    root: path.resolve(liquidTemplatePath),
    extname: '.liquid',
  });

  liquid.registerFilter('camelcase', (value: string) => {
    return _.camelCase(value)
  })

  liquid.registerFilter('snakecase', (value: string) => {
    return _.snakeCase(value)
  })

  liquid.registerFilter('lcfirst', (value: string) => {
    return _.lowerFirst(value)
  })

  liquid.registerFilter('ucfirst', (value: string) => {
    return _.upperFirst(value)
  })

  return liquid
}

interface Config {
  path: string
  pipelines: Pipeline[]
  filters: { [key: string]: { [key: string]: string } }
}

export interface Pipeline {
  type: string
  source: string | null
  special: string | null
  stub: string | null
  path: string | null
  enable: string | null
}

export enum AllowedSource {
  all = 'all',
  tempate = 'template',
  model = 'model',
  controller = '',
  action = 'action',
}

export namespace Stub {
  export type Annotations = { [key: string]: any }

  export class Base {
    assertStubAll() {
      return this as unknown as All
    }

    assertStubTemplate() {
      return this as unknown as Template
    }

    assertStubEnum() {
      return this as unknown as Enum
    }

    assertStubEnumItem() {
      return this as unknown as EnumItem
    }

    assertStubController() {
      return this as unknown as Controller
    }

    assertStubAction() {
      return this as unknown as Action
    }

    assertStubModel() {
      return this as unknown as Model
    }

    assertStubParameter() {
      return this as unknown as Parameter
    }
  }

  export class All extends Base {
    public templates: Stub.Template[] = []
    public specials: { [key: string]: Stub.Template } = {}
  }

  class CommonNamed extends Base {
    public name: string

    constructor(name: string) {
      super()

      this.name = name
    }
  }

  export class Template extends CommonNamed {
    public enums: Stub.Enum[] = []
    public models: Stub.Model[] = []
    public controllers: Stub.Controller[] = []
  }

  class CommonNamedWithCommentAndAnnotation extends CommonNamed {
    public comment: string[] = []
    public annotation: Stub.Annotations = {}
  }

  export class Enum extends CommonNamedWithCommentAndAnnotation {
    items: EnumItem[] = []
  }

  export class EnumItem extends CommonNamedWithCommentAndAnnotation {
    value: string = ''
  }

  export class Controller extends CommonNamedWithCommentAndAnnotation {
    actions: Stub.Action[] = []
  }

  export class Action extends CommonNamedWithCommentAndAnnotation {
    extends: string | null = null
    requests: Stub.Parameter[] = []
    responses: Stub.Parameter[] = []
  }

  export class Model extends CommonNamedWithCommentAndAnnotation {
    parameters: any[] = []
    extends: string | null = null
  }

  export class Parameter extends CommonNamedWithCommentAndAnnotation {
    nullable: boolean = false
    type: string = ''
    is_array: boolean = false
    is_model: boolean = false
    is_enum: boolean = false
  }
}
