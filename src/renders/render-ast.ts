import { AllowedSource, BaseRender, Pipeline, RenderContext } from '../render'
import path from 'path'

export default class extends BaseRender {
  public name = 'ast'
  public allowedSource: AllowedSource | null = AllowedSource.all

  assertConfig(ctx: RenderContext<ASTConfig>): boolean {
    return !!(ctx.pipeline && ctx.pipeline.path)
  }

  render(ctx: RenderContext<ASTConfig>): void {
    const finalPath = path.resolve(this.rootPath, ctx.pipeline.path, 'ast.json')

    const all = ctx.all

    this.fs.writeFile(finalPath, JSON.stringify(all, null, 2))
  }
}

interface ASTConfig extends Pipeline {
  path: string
}
