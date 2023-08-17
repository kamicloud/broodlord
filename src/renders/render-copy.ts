import { BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'copy'
  assertConfig(ctx: RenderContext, pipeline: CopyConfig): boolean {
    return !!(pipeline.src && pipeline.dest)
  }
  render(ctx: RenderContext, pipeline: CopyConfig) {
    this.fs.copyFile(path.resolve(pipeline.src), path.resolve(pipeline.dest))
  }
}

interface CopyConfig extends Pipeline {
  src: string
  dest: string
}
