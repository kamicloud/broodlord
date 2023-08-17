import path from "path";
import { BaseRender, Pipeline, RenderContext, AllowedSource } from "../render";

export default class extends BaseRender {
  public name = 'render'

  assertConfig(ctx: RenderContext, pipeline: LiquidConfig): boolean {
    return !!(pipeline && pipeline.stub && pipeline.source)
  }

  render(ctx: RenderContext, pipeline: LiquidConfig): void {
    const stub = pipeline.stub
    const content = this.liquid.renderFileSync(stub, ctx);

    const contents = content.replace("\r\n", "\n").split("\n")

    const finalPath = path.resolve(this.rootPath, contents[0].trim())

    this.fs.writeFile(finalPath, contents.slice(1).join("\n"))
  }
}

interface LiquidConfig extends Pipeline {
  stub: string
  source: AllowedSource
}
