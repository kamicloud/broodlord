import { AllowedSource, BaseRender, Pipeline, RenderContext } from '../render'
import path from 'node:path'

export default class extends BaseRender {
  public name = 'broodlord'
  public allowedSource: AllowedSource | null = AllowedSource.template

  assertConfig(ctx: RenderContext<BroodlordConfig>): boolean {
    return !!(ctx.pipeline && ctx.pipeline.path)
  }

  render(ctx: RenderContext<BroodlordConfig>): void {
    const finalPath = path.resolve(this.rootPath, ctx.pipeline.path, 'ast.json')

    const all = ctx.all

    this.fs.writeFile(finalPath, JSON.stringify(all, null, 2))
  }
}

interface BroodlordConfig extends Pipeline {
  path: string
}
