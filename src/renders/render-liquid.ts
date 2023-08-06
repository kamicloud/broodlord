import path from "path";
import { BaseRender, Pipeline, RenderContext } from "../render";

export default class extends BaseRender {
  public name = 'render'

  assertConfig(ctx: RenderContext, pipeline: Pipeline): boolean {
    return !!(pipeline && pipeline.stub && pipeline.source)
  }

  render(ctx: RenderContext, pipeline: Pipeline): void {
    const stub = pipeline.stub as string
    const content = this.engine.renderFileSync(stub, ctx);

    const contents = content.replace("\r\n", "\n").split("\n")

    const finalPath = path.resolve(this.rootPath, contents[0].trim())

    this.fs.writeFile(finalPath, contents.slice(1).join("\n"))
  }
}
