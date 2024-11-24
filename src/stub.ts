
export namespace Stub {
  export type Annotations = { [key: string]: any }

  export class Base {
    public comment: string[] = []
  }

  export class All extends Base {
    public templates: Stub.Template[] = []
    public specials: { [key: string]: Stub.Template } = {}
  }

  class Named extends Base {
    public name: string

    constructor(name: string) {
      super()

      this.name = name
    }
  }

  export class Template extends Named {
    public enums: Stub.Enum[] = []
    public models: Stub.Model[] = []
    public controllers: Stub.Controller[] = []
    public scopes: {[key: string]: Stub.Controller[]} = {}
  }

  class NamedWithAnnotation extends Named {
    public annotation: Stub.Annotations = {}
  }

  export class Enum extends NamedWithAnnotation {
    items: EnumItem[] = []
  }

  export enum EnumItemType {
    string = 'string',
    int = 'int',
    float = 'float',
  }

  export class EnumItem extends NamedWithAnnotation {
    type: EnumItemType = EnumItemType.string
    value: string = ''
  }

  export class Controller extends NamedWithAnnotation {
    scope?: string = undefined
    actions: Stub.Action[] = []
  }

  export class Action extends NamedWithAnnotation {
    extends: string | null = null
    requests: Stub.Parameter[] = []
    responses: Stub.Parameter[] = []

    path: string = ''
    methods: string[] = []
    method: {
      OPTION?: boolean,
      GET?: boolean,
      POST?: boolean,
      PUT?: boolean,
      PATCH?: boolean,
      DELETE?: boolean,
    } = {}
  }

  export class Model extends NamedWithAnnotation {
    parameters: any[] = []
    extends: string | null = null
  }

  export class Parameter extends NamedWithAnnotation {
    nullable?: boolean
    type: string = ''
    is_array?: boolean
    is_model?: boolean
    is_enum?: boolean

    is_map?: boolean
    key_type?: string
  }
}
