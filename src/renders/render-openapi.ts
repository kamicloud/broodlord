import { Stub, AllowedSource, BaseRender, Pipeline, RenderContext } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'openapi'
  public allowedSource: AllowedSource | null = AllowedSource.tempate
  assertConfig(ctx: RenderContext, pipeline: Pipeline): boolean {
    return !!(pipeline.path && ctx.template)
  }
  render(ctx: RenderContext, pipeline: Pipeline): void {
    const stubTemplate = ctx.template as Stub.Template

    const openapi: any = {
      openapi: '3.0.1',
      info: {
        title: 'Document',
        version: 'v1'
      },
      paths: {},
      components: {
        schemas: {}
      }
    }

    const handleEnumAST = () => {

      stubTemplate.enums.forEach(stubEnum => {
        const payload: any = {
          type: 'string',
          enum: []
        }

        const enumName = 'Enums.' + stubEnum.name

        stubEnum.items.forEach(stubEnumItem => {
          payload.enum.push(stubEnumItem.value)
        })

        openapi.components.schemas[enumName] = payload
      })
    }

    const handleModelAST = (prefix: string, stubTemplateModel: Stub.Model | Stub.Action, parameters: Stub.Parameter[]) => {
      const stubModel: any = {
        type: 'object',
        description: stubTemplateModel.comment.join("\n"),
        properties: {},
        xml: {},
        required: [] as string[],
      }
      // model comment
      stubModel.description = stubTemplateModel.comment.join("\n")

      // model name
      const modelName = `${prefix}.` + stubTemplateModel.name

      parameters.forEach(stubTemplateModelParameter => {
        const stubParameter: any = {
        }

        stubParameter.description = stubTemplateModelParameter.comment.join("\n")

        let parameterName = stubTemplateModelParameter.name

        stubParameter.required = !stubTemplateModelParameter.nullable

        if (!stubTemplateModelParameter.nullable && stubTemplateModelParameter.type !== 'any') {
          stubModel.required.push(parameterName)
        }

        if (!stubTemplateModelParameter.is_array) {
          if (stubTemplateModelParameter.is_model) {
            stubParameter.$ref = `#/components/schemas/Models.${stubTemplateModelParameter.type}`
          } else if (stubTemplateModelParameter.is_enum) {
            stubParameter.$ref = `#/components/schemas/Enums.${stubTemplateModelParameter.type}`
          } else {
            stubParameter.type = filterType(stubTemplateModelParameter.type)

            if (stubTemplateModelParameter.type === 'any') {
              stubParameter.required = false
            }
          }
        }

        if (stubTemplateModelParameter.is_array) {
          stubParameter.type = 'array'

          if (stubTemplateModelParameter.is_model) {
            stubParameter.xml = {
              name: stubTemplateModelParameter.type,
              wrapped: true,
            }
            stubParameter.items = {
              $ref: `#/components/schemas/Models.${stubTemplateModelParameter.type}`
            }
          } else if (stubTemplateModelParameter.is_enum) {
            stubParameter.xml = {
              name: 'tag',
              wrapped: true,
            }
            stubParameter.items = {
              type: `#/components/schemas/Enums.${stubTemplateModelParameter.type}`
            }
          } else {
            stubParameter.items = {
              type: filterType(stubTemplateModelParameter.type)
            }

            if (stubTemplateModelParameter.type === 'any') {
              stubParameter.required = false
            }
          }
        }

        stubModel.properties[parameterName] = stubParameter
      })

      stubModel.xml.name = modelName

      openapi.components.schemas[modelName] = stubModel
    }

    const handleControllerAST = () => {
      let controllerName = '';

      stubTemplate.controllers.forEach(stubTemplateController => {
        controllerName = stubTemplateController.name

        stubTemplateController.actions.forEach(stubTemplateControllerAction => {
          if (stubTemplateControllerAction.annotation.virtualAPI) {
            return
          }

          stubTemplateController.actions.forEach(stubTemplateControllerAction => {
            if (stubTemplateControllerAction.requests.length) {
              handleModelAST(`Requests.${controllerName}`, stubTemplateControllerAction, stubTemplateControllerAction.requests)
            }

            handleModelAST(`Responses.${controllerName}`, stubTemplateControllerAction, stubTemplateControllerAction.responses)
          })

          const createStubAction = () => {
            const stubAction: any = {
              tags: [],
              summary: stubTemplateControllerAction.comment[0] ? stubTemplateControllerAction.comment[0] : '',
              description: stubTemplateControllerAction.comment.join("\n"),
              responses: {
                '200': {
                  description: stubTemplateControllerAction.comment.join("\n"),
                  content: {
                    'application/json': {
                      schema: {
                        $ref: `#/components/schemas/Responses.${stubTemplateController.name}.${stubTemplateControllerAction.name}`
                      }
                    }
                  }
                }
              },
            }

            stubAction.tags.push(controllerName)

            return stubAction
          }

          const body: { [key: string]: any } = {}

          if (stubTemplateControllerAction.annotation.methods && stubTemplateControllerAction.annotation.methods.indexOf('GET') !== -1) {
            const getStubAction = createStubAction()

            const requests: any[] = []

            stubTemplateControllerAction.requests.forEach(stubTemplateControllerActionRequest => {
              requests.push({
                name: stubTemplateControllerActionRequest.name,
                in: 'query',
                description: stubTemplateControllerActionRequest.comment.join("\n"),
                required: !stubTemplateControllerActionRequest.nullable,
                schema: {
                  type: stubTemplateControllerActionRequest.type
                }
              })
            })
            getStubAction.parameters = requests

            body['get'] = getStubAction
          }

          const postStubAction = createStubAction()

          if (stubTemplateControllerAction.requests.length) {
            postStubAction.requestBody = {
              description: '',
              content: {
                '*/*': {
                  schema: {
                    $ref: `#/components/schemas/Requests.${stubTemplateController.name}.${stubTemplateControllerAction.name}`
                  }
                }
              }
            }
          }

          body['post'] = postStubAction

          openapi.paths[stubTemplateControllerAction.annotation.path ? stubTemplateControllerAction.annotation.path : ('/' + stubTemplateControllerAction.name)] = body
        })
      })
    }

    handleEnumAST()
    stubTemplate.models.forEach(stubTemplateModel => {
      handleModelAST('Models', stubTemplateModel, stubTemplateModel.parameters)
    })
    handleControllerAST()

    const finalPath = path.resolve(this.rootPath, pipeline.path as string, `${stubTemplate.name.toLowerCase()}_openapi.json`)

    this.fs.writeFile(finalPath, JSON.stringify(openapi, null, 2).replace("\r\n", "\n") + "\n")
  }
}

const filterType = (type: string) => {
  switch (type) {
    case 'int':
      return 'integer'
    default:
      return type
  }
}
