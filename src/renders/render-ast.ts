import { AllowedSource, BaseRender, Pipeline, RenderContext } from '../render'
import path from 'path'

export default class extends BaseRender {
  public name = 'ast'
  public allowedSource: AllowedSource | null = AllowedSource.all

  assertConfig(ctx: RenderContext, pipeline: Pipeline): boolean {
    return !!(pipeline && pipeline.path)
  }

  render(ctx: RenderContext, pipeline: Pipeline): void {
    const finalPath = path.resolve(this.rootPath, pipeline.path as string, 'ast.json')

    const all = ctx.all

    this.fs.writeFile(finalPath, JSON.stringify(all, null, 2))
  }
}
