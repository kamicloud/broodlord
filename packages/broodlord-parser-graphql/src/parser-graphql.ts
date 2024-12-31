import * as gql from 'graphql'
import {Stub} from '../../../src/stub';
import fs from 'node:fs';
import {BaseParser, TemplateConfig} from '../../../src/parser';
import _ from 'lodash'

const {Kind} = gql

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
  const templateStub = new Stub.Template('github')

  const controllerStub = new Stub.Controller('Default')
  templateStub.controllers.push(controllerStub)

  gql.parse(fs.readFileSync(path).toString()).definitions.forEach(x => {
    if (x.kind === Kind.DIRECTIVE_DEFINITION) {
      return
    }

    if (x.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
      // comment
      // console.log(x.description?.value)
    } else if (x.kind === Kind.OBJECT_TYPE_DEFINITION) {
      if (x.name.value === 'Query') {
        x.fields?.forEach(field => {
          const actionStub = new Stub.Action(field.name.value)
          controllerStub.actions.push(actionStub)
          getComment(actionStub, field.description)

          if (field.type.kind === Kind.NAMED_TYPE) {
            const parameterStub = new Stub.Parameter('__response')
            actionStub.responses.push(parameterStub)
            parameterStub.type = field.type.name.value

            // console.log(field.type)
          }

          field.arguments?.forEach(argument => {
            const parameterStub = new Stub.Parameter(argument.name.value)

            getComment(parameterStub, argument.description)
            parameterStub.annotation.request = true

            actionStub.requests.push(parameterStub)

            parameterStub.nullable = argument.type.kind === Kind.NON_NULL_TYPE
            // parameterStub.type = argument.type.type.name.value
            if (argument.type.kind === Kind.NON_NULL_TYPE) {
              if (argument.type.type.kind === Kind.NAMED_TYPE) {
                parameterStub.type = argument.type.type.name.value
                // console.log(argument.type.type.name.value)
              }
            }
          })

        })
      } else {
        const modelStub = new Stub.Model(x.name.value)
        templateStub.models.push(modelStub)
        getComment(modelStub, x.description)

        x.fields?.forEach(field => {
          const parameterStub = new Stub.Parameter(field.name.value)
          modelStub.parameters.push(parameterStub)
          getComment(parameterStub, field.description)
        })
      }
    } else if (x.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      //
      // console.log(x.description?.value)
    } else if (x.kind === Kind.ENUM_TYPE_DEFINITION) {
      //
      // console.log(x.description?.value)
    } else if (x.kind === Kind.UNION_TYPE_DEFINITION) {
      //
      // console.log(x.description?.value)
    } else if (x.kind === Kind.SCALAR_TYPE_DEFINITION) {
      //
      // console.log(x.description?.value)
    } else {

    }
  })

  return templateStub
}

const getComment = (stub: Stub.Base, node?: gql.StringValueNode) => {
  stub.comment = node?.value ? node.value.split('\n') : []
}
