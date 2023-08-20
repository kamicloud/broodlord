import { BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'remove'
  assertConfig(ctx: RenderContext<RemoveConfig>): boolean {
    return !!ctx.pipeline.path
  }
  render(ctx: RenderContext<RemoveConfig>) {
    this.fs.rm(path.resolve(this.rootPath, ctx.pipeline.path))
  }
}

interface RemoveConfig extends Pipeline {
  path: string
}
