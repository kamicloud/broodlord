import 'reflect-metadata'

export const ClassDeclarator = (constructor: Function) => {}

export const PropertyDecorator = Reflect.metadata(Symbol(), '')

/**
 * Put parameter to requests list
 */
export const request = PropertyDecorator

/**
 * Make the API not to be generated in openapi
 */
export const virtualAPI = ClassDeclarator

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

export * from './stub'
export * from './render'
