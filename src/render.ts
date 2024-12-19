import { Liquid } from 'liquidjs';
import fs from './helpers/helper-fs'
import { getContextsBySource, LiquidFilters } from './helpers/stub'
import { Stub } from './stub'

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
      if (!this.assertConfig(ctx)) {
        continue
      }

      this.render(ctx)
    }
  }

  abstract assertConfig(ctx: RenderContext<Pipeline>): boolean
  abstract render(ctx: RenderContext<Pipeline>): void
}

export interface RenderContext<T extends Pipeline> {
  path: string,
  all: Stub.All,
  template?: Stub.Template | null,
  controller?: Stub.Controller | null,
  action?: Stub.Action | null,
  request?: Stub.Parameter | null,
  response?: Stub.Parameter | null,
  model?: Stub.Model | null,
  parameter?: Stub.Parameter | null,
  enum?: Stub.Enum | null,
  pipeline: T,
}

export interface RenderConfig {
  template_path: string
  config?: {
    output_root_path?: string
    liquid_template_path?: string
  }
  // enabled renders
  enabled: string[]
  // custom renders
  renders: string[]
  // workflows for each render
  workflows: { [key: string]: WorkflowConfig }
}

export interface WorkflowConfig {
  path: string
  // pipeline in workflow
  pipelines: Pipeline[]
  filters: LiquidFilters
}

export interface Pipeline {
  type: string
  source: AllowedSource | null
  special: string | null
  scope?: string | null
  enable: string | null
}

export enum AllowedSource {
  all = 'all',
  template = 'template',
  constant = 'constant',
  enum = 'enum',
  model = 'model',
  parameter = 'parameter',
  controller = 'controller',
  action = 'action',
  request = 'request',
  response = 'response',
}
