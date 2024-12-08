import {Stub} from "./stub";

export abstract class BaseParser {
  public name = ''
  public config: ParserConfig

  constructor(config: ParserConfig) {
    this.config = config
  }

  abstract parse(template: TemplateConfig): Stub.Template
}

export interface ParserConfig {
  template_path: string
  parsers?: string[]
  template: {
    versions: (string | TemplateConfig)[]
    specials: (string | TemplateConfig)[]
  }
}

export interface TemplateConfig {
  name: string
  // parser name
  type?: string
  path?: string[]
}
