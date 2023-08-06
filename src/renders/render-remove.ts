import { BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'remove'
  assertConfig(ctx: RenderContext, pipeline: Pipeline): boolean {
    return !!pipeline.path
  }
  render(ctx: RenderContext, pipeline: Pipeline) {
    this.fs.rm(path.resolve(this.rootPath, pipeline.path as string))
  }
}
