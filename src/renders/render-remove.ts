import { BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'remove'
  assertConfig(ctx: RenderContext, pipeline: RemoveConfig): boolean {
    return !!pipeline.path
  }
  render(ctx: RenderContext, pipeline: RemoveConfig) {
    this.fs.rm(path.resolve(this.rootPath, pipeline.path))
  }
}

interface RemoveConfig extends Pipeline {
  path: string
}
