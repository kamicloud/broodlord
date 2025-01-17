import ts, {SyntaxKind} from 'typescript';
import {getAnnotation, getBasicTypeByKind, getComment, getName} from '../helpers/ast'
import path from 'node:path'
import {Stub} from '../stub'
import _ from 'lodash'
import {BaseParser, TemplateConfig} from '../parser';

export default class extends BaseParser {
  public name = 'broodlord'

  parse(template: TemplateConfig): Stub.Template {
    if (!template.path) {
      return getTemplate(this.config.template_path, template)
    }

    return getTemplate(this.config.template_path, template)
  }
}

export const getTemplate = (templateRootPath: string, templateConfig: TemplateConfig) => {
  const stubTemplates = (templateConfig.path || [templateConfig.name])
    .map(templatePath => {
      const filename = path.resolve(`${templateRootPath}/${templatePath}.ts`);
      const program = ts.createProgram([filename], {
        allowJs: false,
        removeComments: false,
      });

      const sourceFile = program.getSourceFile(filename) as ts.SourceFile;

      return parseTemplate(templateConfig.name, sourceFile)
    })

  const stubTemplate = mergeTemplate(templateConfig.name, stubTemplates)

  manageTemplate(stubTemplate)

  return stubTemplate
}

const handleEnumAST = (stubTemplate: Stub.Template, ast: ts.Node, sourceFile: ts.SourceFile) => {
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

const parseModelAST = (ast: ts.Node, sourceFile: ts.SourceFile) => {
  const stubModel = new Stub.Model(getName(ast, sourceFile))

  stubModel.comment = getComment(ast)
  stubModel.annotation = getAnnotation(ast, sourceFile)

  childrenToList(ast)
    .filter(modelAST => modelAST.kind !== SyntaxKind.Decorator)
    .forEach(modelAST => {
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
        const handleIfArray = (typeAST: ts.Node) => {
          stubParameter.is_array = true

          decideType(stubParameter, typeAST, sourceFile)
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

          decideType(stubParameter, typeAST, sourceFile)

          return
        }

        // array
        if (parameterAST.kind === SyntaxKind.ArrayType) {
          handleIfArray(parameterAST.getChildAt(0, sourceFile))

          return
        }

        decideType(stubParameter, parameterAST, sourceFile);
      })

      if (!stubParameter.name) {
        return;
      }

      stubModel.parameters.push(stubParameter)
    })

  return stubModel
}

const handleControllerAST = (ast: ts.Node, sourceFile: ts.SourceFile) => {
  const stubController = new Stub.Controller(getName(ast, sourceFile))

  stubController.comment = getComment(ast)
  stubController.annotation = getAnnotation(ast, sourceFile)

  if (!stubController.name) {
    return
  }

  ast.forEachChild(controllerAST => {
    controllerAST.forEachChild(actionsAST => {
      const stubAction = new Stub.Action(getName(controllerAST, sourceFile))

      stubAction.comment = getComment(controllerAST)
      stubAction.annotation = getAnnotation(controllerAST, sourceFile)

      const stubModel = parseModelAST(actionsAST, sourceFile)

      stubAction.annotation = stubModel.annotation
      stubAction.responses = stubModel.parameters
      stubAction.comment = stubModel.comment

      actionsAST.forEachChild(actionAST => {
        if (actionAST.kind === SyntaxKind.Identifier) {
          stubAction.name = actionAST.getText(sourceFile)

          return
        }

        // action extends
        if (actionAST.kind === SyntaxKind.HeritageClause) {
          const extend = actionAST.getChildAt(1, sourceFile).getChildAt(0, sourceFile).getChildAt(0, sourceFile)
          let extendStr = extend.getText(sourceFile)

          if (extendStr.startsWith('Controllers.')) {
            extendStr = extendStr.slice(12)
          }

          stubAction.extends = extend.getChildCount(sourceFile) === 0 ? `${stubController.name}.${extendStr}` : extendStr

          return
        }
      })

      if (stubAction.name) {
        stubController.actions.push(stubAction)
      }
    })
  })

  return stubController
}

export const parseTemplate = (name: string, sourceFile: ts.SourceFile) => {
  const stubTemplate = new Stub.Template(name)

  const sourceFileChildren = childrenToList(sourceFile)

  sourceFileChildren
    .filter(templateAST => templateAST.kind === SyntaxKind.ModuleDeclaration)
    .forEach(templateAST => {
      const templateASTChildren = childrenToList(templateAST);

      const current = templateASTChildren
        .filter(moduleAST => moduleAST.kind === SyntaxKind.Identifier)[0]
        ?.getText(sourceFile)

      const moduleAST = templateASTChildren
        .filter(moduleAST => moduleAST.kind === SyntaxKind.ModuleBlock)[0]

      const moduleASTChildren = childrenToList(moduleAST)

      // enums
      moduleASTChildren
        .filter(ast => ast.kind === SyntaxKind.EnumDeclaration)
        .forEach(ast => handleEnumAST(stubTemplate, ast, sourceFile))

      // models
      moduleASTChildren
        .filter(ast => ast.kind === SyntaxKind.ClassDeclaration)
        .forEach(ast => {
          const stubModel = parseModelAST(ast, sourceFile)

          stubTemplate.models.push(stubModel)
        })

      // controllers & scopes
      moduleASTChildren
        .filter(ast => ast.kind === SyntaxKind.ModuleDeclaration)
        .forEach(ast => {
          const stubController = handleControllerAST(ast, sourceFile)

          if (!stubController) {
            return
          }

          if (current === 'Controllers') {
            stubTemplate.controllers.push(stubController)
          } else {
            const scopeName = current.replace('Controllers', '')

            if (!stubTemplate.scopes[scopeName]) {
              stubTemplate.scopes[scopeName] = []
            }

            stubTemplate.scopes[scopeName].push(stubController)

            stubController.scope = scopeName
          }
        })
    });

  return stubTemplate
}

export const mergeTemplate = (name: string, stubTemplates: Stub.Template[]) => {
  const newTemplate = new Stub.Template(name)

  stubTemplates.forEach(stubTemplate => {
    newTemplate.enums.push(...stubTemplate.enums)
    newTemplate.models.push(...stubTemplate.models)
    newTemplate.controllers.push(...stubTemplate.controllers)

    for (const scope in stubTemplate.scopes) {
      if (Object.prototype.hasOwnProperty.call(stubTemplate.scopes, scope)) {
        const element = stubTemplate.scopes[scope];

        if (!newTemplate.scopes[scope]) {
          newTemplate.scopes[scope] = []
        }

        newTemplate.scopes[scope].push(...element)
      }
    }
  })

  return newTemplate
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

  // prepare data for model extends
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

  const handleControllers = (controllers: Stub.Controller[]) => {
    // prepare data for extends
    controllers.forEach(stubTemplateController => {
      stubTemplateController.actions.forEach(stubTemplateControllerAction => {
        actionsMap[`${stubTemplateController.name}.${stubTemplateControllerAction.name}`] = stubTemplateControllerAction
      })
    })

    // action extends
    controllers.forEach(stubTemplateController => {
      stubTemplateController.actions.forEach(stubTemplateControllerAction => {
        if (stubTemplateControllerAction.extends) {
          stubTemplateControllerAction.responses = getResponsesRecurse(stubTemplateControllerAction)
        }
      })
    })

    controllers.forEach(stubTemplateController => {
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

  handleControllers(stubTemplate.controllers)

  for (const scope in stubTemplate.scopes) {
    if (Object.prototype.hasOwnProperty.call(stubTemplate.scopes, scope)) {
      const element = stubTemplate.scopes[scope];

      handleControllers(element)
    }
  }
}

const childrenToList = (parent?: ts.Node) => {
  const children: ts.Node[] = []

  parent?.forEachChild(child => {
    children.push(child)
  })

  return children
}

const decideType = (stubParameter: Stub.Parameter, parameterAST: ts.Node, sourceFile: ts.SourceFile) => {
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
      if (parameterTypeAST.kind !== SyntaxKind.SyntaxList) {
        return
      }

      parameterTypeAST.getChildren(sourceFile).forEach(mapAST => {
        // map
        if (mapAST.kind !== SyntaxKind.IndexSignature) {
          return
        }

        stubParameter.is_map = true
        const keyAST = mapAST.getChildAt(1, sourceFile)
        const valueAST = mapAST.getChildAt(4, sourceFile)

        const guessType = getBasicTypeByKind(keyAST.getChildAt(0, sourceFile).getChildAt(2, sourceFile).kind)

        if (guessType) {
          stubParameter.key_type = guessType
        }

        decideType(stubParameter, valueAST, sourceFile)
      })
    })
  }
}
