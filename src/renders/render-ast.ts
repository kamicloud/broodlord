import { AllowedSource, BaseRender, Pipeline, RenderContext } from '../render'
import path from 'path'

export default class extends BaseRender {
  public name = 'ast'
  public allowedSource: AllowedSource | null = AllowedSource.all

  assertConfig(ctx: RenderContext, pipeline: ASTConfig): boolean {
    return !!(pipeline && pipeline.path)
  }

  render(ctx: RenderContext, pipeline: ASTConfig): void {
    const finalPath = path.resolve(this.rootPath, pipeline.path, 'ast.json')

    const all = ctx.all

    this.fs.writeFile(finalPath, JSON.stringify(all, null, 2))
  }
}

interface ASTConfig extends Pipeline {
  path: string
}
