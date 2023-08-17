import { BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'move'
  assertConfig(ctx: RenderContext, pipeline: MoveConfig): boolean {
    return !!(pipeline.src && pipeline.dest)
  }
  render(ctx: RenderContext, pipeline: MoveConfig) {
    this.fs.rename(path.resolve(pipeline.src), path.resolve(pipeline.dest))
  }
}

interface MoveConfig extends Pipeline {
  src: string
  dest: string
}
