import ts, { SyntaxKind } from "typescript";
import { getAnnotation, getBasicTypeByKind, getComment, getName } from './helpers/ast'
import path from 'path'
import { Stub } from './render'
import _ from 'lodash'

const getTemplate = (template_path: string, name: string) => {
  const filename = path.resolve(`${template_path}/${name}.ts`);
  const program = ts.createProgram([filename], {
    allowJs: false,
    removeComments: false,
  });

  const sourceFile = program.getSourceFile(filename) as ts.SourceFile;

  const stubTemplate = parseTemplate(name, sourceFile)

  manageTemplate(stubTemplate)

  return stubTemplate
}

export const parseAll = (template_path: string, templates: string[], specials: string[]) => {
  const all = new Stub.All()

  templates.forEach(template => {
    all.templates.push(getTemplate(template_path, template))
  })

  specials.forEach(special => {
    all.specials[special] = getTemplate(template_path, special)
  })

  return all
}

export const parseTemplate = (name: string, sourceFile: ts.SourceFile) => {
  const stubTemplate = new Stub.Template(name)

  const handleEnumAST = (ast: ts.Node) => {
    const stubEnum = new Stub.Enum(getName(ast, sourceFile))

    stubEnum.comment = getComment(ast)
    stubEnum.annotation = getAnnotation(ast, sourceFile)

    ast.forEachChild(enumAST => {
      const stubEnumItem = new Stub.EnumItem(getName(enumAST, sourceFile))

      stubEnumItem.comment = getComment(enumAST)
      stubEnumItem.annotation = getAnnotation(enumAST, sourceFile)

      // default to name
      stubEnumItem.type = Stub.EnumItemType.string
      stubEnumItem.value = getName(enumAST, sourceFile)

      if (enumAST.kind === SyntaxKind.EnumMember) {
        // enum item name
        // when enum item has comment, value will appear at 3rd child
        const value = enumAST.getChildAt(2, sourceFile)?.kind === SyntaxKind.EqualsToken ?
          enumAST.getChildAt(3, sourceFile) :
          enumAST.getChildAt(2, sourceFile)

        if (!value) {
          return
        }

        stubEnumItem.type = value.kind === SyntaxKind.StringLiteral ? Stub.EnumItemType.string : Stub.EnumItemType.int
        stubEnumItem.value = (value as any).text

        stubEnum.items.push(stubEnumItem)

        return
      }
    })

    stubTemplate.enums.push(stubEnum)
  }

  const handleModelAST = (ast: ts.Node) => {
    const stubModel = new Stub.Model(getName(ast, sourceFile))

    stubModel.comment = getComment(ast)
    stubModel.annotation = getAnnotation(ast, sourceFile)

    ast.forEachChild(modelAST => {
      if (modelAST.kind === SyntaxKind.Decorator) {
        return;
      }

      const stubParameter = new Stub.Parameter(getName(modelAST, sourceFile))

      stubParameter.comment = getComment(modelAST)
      stubParameter.annotation = getAnnotation(modelAST, sourceFile)

      // extends
      if (modelAST.kind === SyntaxKind.HeritageClause) {
        // console.log(modelAST)
        stubModel.extends = modelAST.getChildAt(1, sourceFile).getText(sourceFile)

        return
      }

      modelAST.forEachChild(parameterAST => {
        const decideType = (parameterAST: ts.Node) => {
          const guessType = getBasicTypeByKind(parameterAST.kind)

          if (guessType !== null) {
            stubParameter.type = guessType

            return
          }

          // other types
          if (parameterAST.kind === SyntaxKind.TypeReference) {
            parameterAST.forEachChild(parameterTypeAST => {
              if (parameterTypeAST.kind === SyntaxKind.Identifier) {
                stubParameter.type = parameterTypeAST.getText(sourceFile)

                return
              }

              if (parameterTypeAST.kind === SyntaxKind.QualifiedName) {
                const relatedType = parameterTypeAST.getChildAt(0, sourceFile).getText(sourceFile)
                stubParameter.type = parameterTypeAST.getChildAt(2, sourceFile).getText(sourceFile)

                if (relatedType === 'Enums') {
                  stubParameter.is_enum = true
                } else if (relatedType === 'Models') {
                  stubParameter.is_model = true
                }

                return;
              }
            })

            return
          }

          if (parameterAST.kind === SyntaxKind.TypeLiteral) {
            parameterAST.getChildren(sourceFile).forEach(parameterTypeAST => {
              if (parameterTypeAST.kind === SyntaxKind.SyntaxList) {
                parameterTypeAST.getChildren(sourceFile).forEach(mapAST => {
                  // map
                  if (mapAST.kind === SyntaxKind.IndexSignature) {
                    stubParameter.is_map = true
                      const keyAST = mapAST.getChildAt(1, sourceFile)
                      const valueAST = mapAST.getChildAt(4, sourceFile)

                      const guessType = getBasicTypeByKind(keyAST.getChildAt(0, sourceFile).getChildAt(2, sourceFile).kind)

                      if (guessType) {
                        stubParameter.key_type = guessType
                      }

                      decideType(valueAST)
                  }
                })
              }
            })
          }
        }

        const handleIfArray = (typeAST: ts.Node) => {
          stubParameter.is_array = true

          decideType(typeAST)
        }

        // type | null
        if (parameterAST.kind === SyntaxKind.UnionType) {
          const childAST = parameterAST.getChildAt(0, sourceFile)
          const typeAST = childAST.getChildAt(0, sourceFile)

          const nullableAST = childAST.getChildAt(2, sourceFile)

          // console.log(childAST, childAST.getText(sourceFile))
          if (nullableAST.getText(sourceFile) === 'null') {
            stubParameter.nullable = true
          }

          if (typeAST.kind === SyntaxKind.ArrayType) {
            handleIfArray(typeAST.getChildAt(0, sourceFile))

            return;
          }

          decideType(typeAST)

          return
        }

        // array
        if (parameterAST.kind === SyntaxKind.ArrayType) {
          handleIfArray(parameterAST.getChildAt(0, sourceFile))

          return
        }

        decideType(parameterAST);
      })

      if (!stubParameter.name) {
        return;
      }

      stubModel.parameters.push(stubParameter)
    })

    return stubModel
  }

  const handleControllerAST = (ast: ts.Node) => {
    const stubController = new Stub.Controller(getName(ast, sourceFile))

    stubController.comment = getComment(ast)
    stubController.annotation = getAnnotation(ast, sourceFile)

    if (!stubController.name) {
      return
    }

    stubTemplate.controllers.push(stubController)

    ast.forEachChild(controllerAST => {
      controllerAST.forEachChild(actionsAST => {
        const stubAction = new Stub.Action(getName(controllerAST, sourceFile))

        stubAction.comment = getComment(controllerAST)
        stubAction.annotation = getAnnotation(controllerAST, sourceFile)

        const stubModel = handleModelAST(actionsAST)

        stubAction.annotation = stubModel.annotation
        stubAction.responses = stubModel.parameters
        stubAction.comment = stubModel.comment

        actionsAST.forEachChild(actionAST => {
          if (actionAST.kind === SyntaxKind.Identifier) {
            stubAction.name = actionAST.getText(sourceFile)

            return
          }

          if (actionAST.kind === SyntaxKind.HeritageClause) {
            const extend = actionAST.getChildAt(1, sourceFile)

            stubAction.extends = extend.getChildCount(sourceFile) === 1 ? `${stubController.name}.${extend.getText(sourceFile)}` : extend.getText(sourceFile)

            return
          }
        })

        if (stubAction.name) {
          stubController.actions.push(stubAction)
        }
      })
    })
  }

  sourceFile?.forEachChild(templateAST => {
    if (templateAST.kind !== SyntaxKind.ModuleDeclaration) {
      return
    }

    // NodeObject - imports, declares
    templateAST.forEachChild(moduleAST => {
      // ignore declare
      if (moduleAST.kind === SyntaxKind.DeclareKeyword) {
        return
      }

      if (moduleAST.kind === SyntaxKind.ModuleBlock) {
        moduleAST.forEachChild((ast) => {
          switch (ast.kind) {
            case SyntaxKind.EnumDeclaration:
              // enums
              handleEnumAST(ast)

              break;
            case SyntaxKind.ClassDeclaration:
              // models
              const stubModel = handleModelAST(ast)
              stubTemplate.models.push(stubModel)

              break;
            case SyntaxKind.ModuleDeclaration:
              // controllers
              handleControllerAST(ast)

              break;
          }
        })

        return
      }
    })
  })

  return stubTemplate
}

export const manageTemplate = (stubTemplate: Stub.Template) => {
  const modelsMap: { [key: string]: Stub.Model } = {}
  const actionsMap: { [key: string]: Stub.Action } = {}

  const getParametersRecurse = (stubModel: Stub.Model): Stub.Parameter[] => {
    if (stubModel.extends) {
      return _.uniqBy([
        ...getParametersRecurse(modelsMap[stubModel.extends]),
        ...stubModel.parameters,
      ].reverse(), parameter => parameter.name).reverse()
    }

    return stubModel.parameters
  }

  const getResponsesRecurse = (stubAction: Stub.Action): Stub.Parameter[] => {
    if (stubAction.extends && actionsMap[stubAction.extends]) {
      return _.uniqBy([
        ...getResponsesRecurse(actionsMap[stubAction.extends]),
        ...stubAction.responses,
      ].reverse(), action => action.name).reverse()
    }

    return stubAction.responses
  }

  // prepare data for modeal extends
  stubTemplate.models.forEach(stubModel => {
    modelsMap[stubModel.name] = stubModel
  })

  // model extends
  stubTemplate.models.forEach(stubModel => {
    if (stubModel.extends) {
      stubModel.parameters = getParametersRecurse(stubModel)
    }

    stubModel.parameters.forEach(stubModelParameter => {
      if (modelsMap[stubModelParameter.type]) {
        stubModelParameter.is_model = true
      }
    })
  })

  // prepare data for extends
  stubTemplate.controllers.forEach(stubTemplateController => {
    stubTemplateController.actions.forEach(stubTemplateControllerAction => {
      actionsMap[`${stubTemplateController.name}.${stubTemplateControllerAction.name}`] = stubTemplateControllerAction
    })
  })

  // action extends
  stubTemplate.controllers.forEach(stubTemplateController => {
    stubTemplateController.actions.forEach(stubTemplateControllerAction => {
      if (stubTemplateControllerAction.extends) {
        stubTemplateControllerAction.responses = getResponsesRecurse(stubTemplateControllerAction)
      }
    })
  })

  stubTemplate.controllers.forEach(stubTemplateController => {
    stubTemplateController.actions.forEach(stubTemplateControllerAction => {
      if (stubTemplateControllerAction.annotation.methods) {
        stubTemplateControllerAction.annotation.methods.forEach((method: string) => {
          if (method === 'OPTION') {
            stubTemplateControllerAction.method.OPTION = true
          }
          if (method === 'GET') {
            stubTemplateControllerAction.method.GET = true
          }
          if (method === 'POST') {
            stubTemplateControllerAction.method.POST = true
          }
          if (method === 'PUT') {
            stubTemplateControllerAction.method.PUT = true
          }
          if (method === 'PATCH') {
            stubTemplateControllerAction.method.PATCH = true
          }
          if (method === 'DELETE') {
            stubTemplateControllerAction.method.DELETE = true
          }

          stubTemplateControllerAction.methods.push(method)
        })
      }
      const requests: Stub.Parameter[] = [];
      const responses: Stub.Parameter[] = [];

      // __request & __response
      const excludeMagicParameters = stubTemplateControllerAction.responses.filter((stubParameter) => {
        if (stubParameter.name === '__request' && stubParameter.is_model && modelsMap[stubParameter.type]) {
          modelsMap[stubParameter.type].parameters.forEach(stubModelParameter => {
            requests.push(stubModelParameter)
          })

          return false;
        }

        if (stubParameter.name === '__response' && stubParameter.is_model && modelsMap[stubParameter.type]) {
          modelsMap[stubParameter.type].parameters.forEach(stubModelParameter => {
            responses.push(stubModelParameter)
          })

          return false
        }

        return true
      })

      excludeMagicParameters.forEach(stubTemplateControllerActionResponse => {
        if (stubTemplateControllerActionResponse.annotation.request) {
          requests.push(stubTemplateControllerActionResponse)
        } else {
          responses.push(stubTemplateControllerActionResponse)
        }
      })

      stubTemplateControllerAction.requests = requests
      stubTemplateControllerAction.responses = responses
    })
  })
}
