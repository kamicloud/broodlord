import { BaseRender, Pipeline, RenderContext } from '../render';
import path from 'node:path'

export default class extends BaseRender {
  public name = 'move'
  assertConfig(ctx: RenderContext<MoveConfig>): boolean {
    return !!(ctx.pipeline.src && ctx.pipeline.dest)
  }
  render(ctx: RenderContext<MoveConfig>) {
    this.fs.rename(path.resolve(ctx.pipeline.src), path.resolve(ctx.pipeline.dest))
  }
}

interface MoveConfig extends Pipeline {
  src: string
  dest: string
}
