import { methods, Method, request, ClassDeclarator, PropertyDecorator } from '../../src/definitions'

type customInt = number

const stringClassAnnotation = (param1: string) => ClassDeclarator
const numberClassAnnotation = (param1: number) => ClassDeclarator

// TODO not supported yet
declare namespace Constants {
  const HELLO = 'hello'
  const WORLD = 2423
}

namespace Enums {
  /**
   * Basic Enum
   * No value was set in Enum
   */
  export enum BasicEnum {
    HELLO,
    WORLD,
  }

  // Double slash comment won't be parsed
  export enum StringEnum {
    HELLO = 'hello',
    WORLD = 'world',
  }

  /** Another Comment Type */
  /** Another Comment Type Line2 */
  export enum IntEnum {
    HELLO = 3,
    FOO,
    WORLD = 4,
    BAR,
  }

  // TODO
  enum FloatEnum {
    HELLO = 3.14,
    WORLD = 15926,
  }

  /**
   *
   * @deprecated
   */
  enum MixedEnum {
    HELLO = 'hello',
    FOO = 2,
    WORLD = 'world',
    BAR = 5,
  }

  export class ClassEnum {
    HELLO = 'hello'
    WORLD = 'world'
  }
}

export declare namespace Models {
  @stringClassAnnotation('hi')
  @numberClassAnnotation(123)
  class Hello {
    string: string
    string_or_null: string | null
    number: number
    number_or_null: number | null
    map_string_to_string: { [key: string]: string }
    map_number_to_string: { [key: number]: string }
    map_string_to_number: { [key: string]: number }
    map_string_to_string_or_null: { [key: string]: string } | null
    map_number_to_string_or_null: { [key: number]: string } | null
    map_string_to_number_or_null: { [key: string]: number } | null
    map_string_to_model_or_null: { [key: number]: Models.World } | null
    map_string_to_enum_or_null: { [key: string]: Enums.BasicEnum } | null
    custom: customInt
    custom_or_null: customInt | null

    enum: Enums.StringEnum
    enum_or_null: Enums.StringEnum | null
    model: Models.World
    model_or_null: Models.World | null
    model_without_prefix: World
    model_without_prefix_or_null: World | null

    string_array: string[]
    number_array: number[]
    map_string_to_string_array: { [key: string]: string }[]
    map_number_to_string_array: { [key: number]: string }[]
    map_string_to_number_array: { [key: string]: number }[]
    map_string_to_model_array: { [key: string]: Models.World }[]
    map_string_to_enum_array: { [key: string]: Enums.BasicEnum }[]
    enum_array: Enums.StringEnum[]
    model_array: Models.World[]
    model_without_prefix_array: World[]
    custom_array: customInt[]
  }

  class World {
    // empty
  }

  class ExtendExample extends Hello {

  }

  class ExtendAddNewAttributeExample extends Hello {
    new_attribute: string
  }

  // TODO: not supported yet
  class Generics<T> {
    typeT: T
  }
}

declare namespace V2Controllers {
  namespace Hello {
    @methods([Method.GET, Method.POST])
    class Hello {
      @request
      number_request: number

      number_response: number
    }

    class World {

    }
  }

  namespace World {
    class Hello {
      @request
      number_request: number

      number_response: number
    }

    class World {

    }
  }

  namespace MagicProperty {
    /**
     * @see magic property
     */
    class Hello {
      __request: Models.Hello
      __response: Models.Hello
    }

    class World {

    }
  }

  namespace Extends {
    class Hello {
      @request
      hello: number

      world: string
    }

    class ExtendInNamespace extends Hello {

    }

    // TODO
    class ExtendAcrossNamespace extends World.Hello {

    }

    // TODO
    class ExtendAcrossNamespaceWithPrefix extends Controllers.Hello.Hello {

    }
  }

  // TODO: not supported yet
  namespace Generics {
    class Test {
      hello: Models.Generics<number>
      world: Models.Generics<Models.Hello>
    }
  }

  namespace ClassEnum {
    class Test {
      classEnum: Enums.ClassEnum
    }
  }
}


declare namespace Controllers {
  namespace Hello {
    @methods([Method.GET, Method.POST])
    class Hello {
      @request
      number_request: number

      number_response: number
    }

    class World {

    }
  }

  namespace World {
    class Hello {
      @request
      number_request: number

      number_response: number
    }

    class World {

    }
  }

  namespace MagicProperty {
    /**
     * @see magic property
     */
    class Hello {
      __request: Models.Hello
      __response: Models.Hello
    }

    class World {

    }
  }

  namespace Extends {
    class Hello {
      @request
      hello: number

      world: string
    }

    class ExtendInNamespace extends Hello {

    }

    // TODO
    class ExtendAcrossNamespace extends World.Hello {

    }

    // TODO
    class ExtendAcrossNamespaceWithPrefix extends Controllers.Hello.Hello {

    }
  }

  // TODO: not supported yet
  namespace Generics {
    class Test {
      hello: Models.Generics<number>
      world: Models.Generics<Models.Hello>
    }
  }

  namespace ClassEnum {
    class Test {
      classEnum: Enums.ClassEnum
    }
  }
}

declare namespace Views {

}
