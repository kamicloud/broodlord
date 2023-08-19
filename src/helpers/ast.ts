import fs from "fs";
import ts, {SyntaxKind} from "typescript";
import {Stub} from '../render'

export const writeASTFile = (astTargetPath: string, sourceFile: ts.SourceFile) => {
  const cache: any[] = [];

  fs.writeFileSync(astTargetPath, JSON.stringify(sourceFile, (key, value) => {
    // Discard the following.
    if (key === 'flags' || key === 'transformFlags' || key === 'modifierFlagsCache') {
      return;
    }

    // Replace 'kind' with the string representation.
    if (key === 'kind') {
      value = ts.SyntaxKind[value];
    }

    if (typeof value === 'object' && value !== null) {
      // Duplicate reference to found, discard key
      if (cache.includes(value)) return;

      cache.push(value);
    }
    return value;
  }, 2))
}

export const getBasicTypeByKind = (kind: SyntaxKind) => {
  // number
  if (kind === SyntaxKind.NumberKeyword) {
    return 'number'
  }

  // string
  if (kind === SyntaxKind.StringKeyword) {
    return 'string'
  }

  // boolean
  if (kind === SyntaxKind.BooleanKeyword) {
    return 'boolean'
  }

  if (kind === SyntaxKind.AnyKeyword) {
    return 'any'
  }

  return null
}

export const getName = (ast: ts.Node, sourceFile: ts.SourceFile) => {
  let name = ''

  ast.forEachChild(enumAST => {
    // enum name
    if (enumAST.kind === SyntaxKind.Identifier) {
      name = enumAST.getText(sourceFile)
    }
  })

  return name
}

export const getComment = (ast: ts.Node): string[] => {
  const comment: string[] = []

  if ((ast as any).jsDoc) {
    (ast as any).jsDoc.forEach((doc: any) => {
      doc.comment.split("\n").forEach((single_comment: string) => {
        comment.push(single_comment)
      })
    })
  }

  return comment
}

export const getAnnotation = (ast: ts.Node, sourceFile: ts.SourceFile) => {
  const annotations: Stub.Annotations = {}

  ast.forEachChild(ast => {
    // enum annotation
    if (ast.kind !== SyntaxKind.Decorator) {
      return
    }

    ast.forEachChild((annotationAST) => {
      const annotation = annotationAST.getChildAt(0, sourceFile) || annotationAST
      const param = annotationAST.getChildAt(2, sourceFile)

      const annotationText = annotation?.getText(sourceFile);

      if (annotationText === 'methods') {
        const methods: string[] = [];

        param.getChildAt(0, sourceFile).forEachChild(methodAST => {
          methods.push(methodAST.getChildAt(2, sourceFile).getText(sourceFile))
        })

        annotations['methods'] = methods
      } else {
        annotations[annotationText] = param && param.getText(sourceFile) ? (param.getChildAt(0) as any).text : true
      }
    })

    return
  })

  return annotations
}

export const getTypeFromTypeReference = (parameterTypeAST: ts.Node, sourceFile: ts.SourceFile) => {
  let type = parameterTypeAST.getText(sourceFile);

  parameterTypeAST.forEachChild(parameterTypeAST2 => {
    if (parameterTypeAST2.kind === SyntaxKind.Identifier) {
      type = parameterTypeAST2.getText(sourceFile)

      return
    }

    if (parameterTypeAST2.kind === SyntaxKind.QualifiedName) {
      type = parameterTypeAST2.getChildAt(2, sourceFile).getText(sourceFile)

      return;
    }
  })

  return type
}
