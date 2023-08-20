import { BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'copy'
  assertConfig(ctx: RenderContext<CopyConfig>): boolean {
    return !!(ctx.pipeline.src && ctx.pipeline.dest)
  }
  render(ctx: RenderContext<CopyConfig>) {
    this.fs.copyFile(path.resolve(ctx.pipeline.src), path.resolve(ctx.pipeline.dest))
  }
}

interface CopyConfig extends Pipeline {
  src: string
  dest: string
}
