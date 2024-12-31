import fs from 'node:fs'
import {Stub} from '../stub'
import {BaseParser, TemplateConfig} from '../parser';
import _ from 'lodash';

export default class extends BaseParser {
  public name = 'graphql'

  parse(template: TemplateConfig): Stub.Template {
    if (!_.isString(template.path)) {
      return new Stub.Template(template.name)
    }

    return parse(template.path)
  }
}

export const parse = (path: string) => {
  const openapiJson = fs.readFileSync(path)
  const openapi = JSON.parse(openapiJson.toString())

  const templateStub = new Stub.Template('openapi');

  for (const schemaName in openapi.components.schemas) {
    const schema = openapi.components.schemas[schemaName]

    if (schema.enum) {
      const stubEnum = new Stub.Enum(schemaName)
      templateStub.enums.push(stubEnum)
      getComment(stubEnum, schema)

      for (const value of schema.enum) {
        const stubEnumValue = new Stub.EnumItem(value)
        stubEnum.items.push(stubEnumValue)
      }
    } else if (schema.type === 'object') {
      const stubModel = new Stub.Model(schemaName)

      templateStub.models.push(stubModel)
      getComment(stubModel, schema)

      for (const propertyName in schema.properties) {
        const property = schema.properties[propertyName]
        const stubParameter = new Stub.Parameter(propertyName)
        stubModel.parameters.push(stubParameter)

        stubParameter.type = property.type
        if (property.type === 'array') {
          stubParameter.is_array = true
        }

        if (property.items && property.items.type) {
          stubParameter.type = property.items.type
        }

        getComment(stubParameter, property)

        if (property.items && property.items.$ref) {
          buildParameter(openapi, property.items.$ref, stubParameter)
        }

        if (property.$ref) {
          buildParameter(openapi, property.$ref, stubParameter)
        }
      }
    }
  }

  const controllerMap = {} as {[key: string]: Stub.Controller}

  for (const path in openapi.paths) {
    const apis = openapi.paths[path]

    for (const httpMethod in apis) {
      const api = apis[httpMethod]
      const controllerName = api.tags[0]

      if (!controllerMap[controllerName]) {
        controllerMap[controllerName] = new Stub.Controller(controllerName)
        templateStub.controllers.push(controllerMap[controllerName])
      }

      const stubController = controllerMap[controllerName]

      const stubAction = new Stub.Action(api.operationId)
      getComment(stubAction, api)
      stubAction.annotation.path = path

      stubAction.method = {}

      // @ts-ignore
      stubAction.method[httpMethod.toString().toUpperCase()] = true
      stubAction.methods.push(httpMethod.toString().toUpperCase())

      stubController.actions.push(stubAction)

      const responses = api.responses['200'];

      const stubParameter = new Stub.Parameter('data')
      stubAction.responses.push(stubParameter)

      getComment(stubParameter, responses)

      if (responses.content && responses.content['application/json'] && responses.content['application/json'].schema) {
        stubParameter.type = responses.content['application/json'].schema.type

        if (responses.content['application/json'].schema.type === 'array') {
          stubParameter.is_array = true
        }

        if (responses.content['application/json'].schema.$ref) {
          buildParameter(openapi, responses.content['application/json'].schema.$ref, stubParameter)
        }
      }

      if (api.parameters) {
        api.parameters.forEach((parameter: any) => {
          const stubParameter = new Stub.Parameter(parameter.name)
          stubAction.requests.push(stubParameter)

          stubParameter.type = parameter.schema.type
          if (parameter.schema.type === 'array') {
            stubParameter.is_array = true
          }

          if (parameter.schema.items && parameter.schema.items.type) {
            stubParameter.type = parameter.schema.items.type
          }

          getComment(stubParameter, parameter)

          if (parameter.schema.$ref) {
            buildParameter(openapi, parameter.schema.$ref, stubParameter)
          }

          stubParameter.annotation.request = true
          if (parameter.in === 'path') {
            stubParameter.annotation.inPath = true
          }
        })
      }

      if (api.requestBody) {
        const stubParameter = new Stub.Parameter('__request')
        stubAction.requests.push(stubParameter)
        getComment(stubParameter, api.requestBody)
        stubParameter.annotation.request = true

        if (api.requestBody.content && api.requestBody.content['application/json'] && api.requestBody.content['application/json'].schema) {
          if (api.requestBody.content['application/json'].schema.items && api.requestBody.content['application/json'].schema.items.$ref) {
            if (api.requestBody.content['application/json'].schema.items.type === 'array') {
              stubParameter.is_array = true
            }
            buildParameter(openapi, api.requestBody.content['application/json'].schema.items.$ref, stubParameter)
          } else {
            buildParameter(openapi, api.requestBody.content['application/json'].schema.$ref, stubParameter)
          }
        }
      }
    }
  }

  return templateStub
}

const getComment = (stub: Stub.Base, property: any) => {
  if (property.description) {
    stub.comment = property.description.split('\n').map((v: string) => v.trim())
  }

  if (property.summary) {
    stub.comment = property.summary.split('\n').map((v: string) => v.trim())
  }
}

const buildParameter = (openapi: any, ref: any, stubParameter: Stub.Parameter) => {
  const refNames = ref.split('/')
  const refName = refNames[refNames.length - 1]
  stubParameter.type = refName

  if (openapi.components.schemas[refName].enum) {
    stubParameter.is_enum = true
  } else {
    stubParameter.is_model = true

    stubParameter.type = refName
  }

}
