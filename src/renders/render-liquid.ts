import path from "path";
import { BaseRender, Pipeline, RenderContext, AllowedSource } from "../render";

export default class extends BaseRender {
  public name = 'render'

  assertConfig(ctx: RenderContext<LiquidConfig>): boolean {
    return !!(ctx.pipeline && ctx.pipeline.stub && ctx.pipeline.source)
  }

  render(ctx: RenderContext<LiquidConfig>): void {
    const stub = ctx.pipeline.stub
    const content = this.liquid.renderFileSync(stub, ctx);

    const contents = content.split("\n")

    const finalPath = path.resolve(this.rootPath, contents[0].trim())

    this.fs.writeFile(finalPath, contents.slice(1).join("\n"))
  }
}

interface LiquidConfig extends Pipeline {
  stub: string
  source: AllowedSource
}
