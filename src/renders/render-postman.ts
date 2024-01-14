import { AllowedSource, BaseRender, Pipeline, RenderContext, Stub } from "../render";
import path from 'path'

export default class extends BaseRender {
  public name = 'postman'
  public allowedSource: AllowedSource | null = AllowedSource.template
  assertConfig(ctx: RenderContext<PostmanConfig>): boolean {
    return !!ctx.pipeline.path
  }
  render(ctx: RenderContext<PostmanConfig>) {
    const stubTemplate = ctx.template as Stub.Template

    const postmanStub: PostmanStub = {
      info: {
        _postman_id: '',
        name: '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
    }

    stubTemplate.controllers.forEach(stubController => {
      const postmanItemStub = {
        name: stubController.name + stubController.comment.join(' '),
        item: [] as PostmanActionStub[]
      }

      stubController.actions.forEach(stubAction => {
        const actionStub: PostmanActionStub = {
          name: stubAction.name,
          request: {
            method: 'POST',
            description: stubAction.comment.join("\n"),
            header: [],
            body: {
              mode: 'formdata',
              formdata: [],
              urlencoded: [],
            },
            url: {
              raw: '',
              protocol: '',
              host: ['{{host}}'],
              path: [
                stubTemplate.name + stubAction.annotation.path,
              ]
            },
          },
        }

        stubAction.requests.forEach(stubRequest => {
          const postmanParameterStub: PostmanParameterStub = {
            key: stubRequest.name,
            value: '',
            type: stubRequest.type,
            description: stubRequest.comment.join("\n"),
            disabled: false,
          }

          if (actionStub.request) {
            actionStub.request.body.formdata.push(postmanParameterStub)
          }
        })

        postmanItemStub.item.push(actionStub)
      })

      postmanStub.item.push(postmanItemStub)
    })

    const finalPath = path.resolve(this.rootPath, ctx.pipeline.path, `${stubTemplate.name.toLowerCase()}_postman.json`)

    this.fs.writeFile(finalPath, JSON.stringify(postmanStub, null, 2) + "\n")
  }
}

interface PostmanStub {
  info: PostmanInfoStub
  item: PostmanFolderStub[]
}

interface PostmanFolderStub {
  name: string
  item: PostmanActionStub[]
}

interface PostmanInfoStub {
  _postman_id: string
  name: string
  schema: string
}

interface PostmanActionStub {
  name: string
  request?: PostmanItemRequestStub
}

interface PostmanItemRequestStub {
  method: string
  header: string[]
  body: PostmanItemRequestBodyStub
  url: PostmanItemRequestUrlStub
  description: string
}

interface PostmanItemRequestBodyStub {
  mode: string
  formdata: PostmanParameterStub[]
  urlencoded: PostmanParameterStub[]
}

interface PostmanItemRequestUrlStub {
  raw: string
  protocol: string
  host: string[]
  path: string[]
}

interface PostmanParameterStub {
  key: string
  value: string
  type: string
  description: string
  disabled: boolean
}

interface PostmanConfig extends Pipeline {
  path: string
}
