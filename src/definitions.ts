import 'reflect-metadata'

export const ClassDeclarator = (constructor: Function) => {}

export const PropertyDecorator = Reflect.metadata(Symbol(), '')

/**
 * Reserved for Http Methods
 */
export const methods = (methods: Method[]) => ClassDeclarator

export enum Method {
  OPTION,
  GET,
  POST,
  PUT,
  PATCH,
  DELETE
}

export * from './render'
