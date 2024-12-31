import { AllowedSource, RenderContext, Pipeline } from '../render'
import { Stub } from '../stub'
import _ from 'lodash'
import { Liquid } from 'liquidjs'
import path from 'node:path'

const getContextByTemplate = (
  stubAll: Stub.All,
  source: string | null,
  path: string,
  pipeline: Pipeline,
  template?: Stub.Template | null,
  scope?: string | null
): RenderContext<Pipeline>[] => {
  const { enable } = pipeline
  const enableAnnotation = enable
  const res: RenderContext<Pipeline>[] = []

  const basic = {
    path,
    all: stubAll,
    template,
    pipeline,
  }

  if (!template) {
    return [basic]
  }

  if (source === AllowedSource.template) {
    if (scope) {
      return [{
        ...basic,
        template: {
          ...template,
          controllers: template.scopes[scope]
        }
      }]
    }

    return [{
      ...basic,
    }]
  }

  if (source === AllowedSource.enum) {
    return template.enums.map(stubEnum => {
      return {
        ...basic,
        enum: stubEnum,
      }
    })
  }

  if (source === AllowedSource.model) {
    template.models.forEach(model => {
      if (enableAnnotation && !model.annotation[enableAnnotation]) {
        return
      }

      res.push({
        ...basic,
        model,
      })
    })

    return res
  }

  if (source === AllowedSource.parameter) {
    template.models.forEach(model => {
      model.parameters.forEach(parameter => {
        if (enableAnnotation && !parameter.annotation[enableAnnotation]) {
          return
        }

        res.push({
          ...basic,
          model,
          parameter,
        })
      })
    })

    return res
  }

  if (source === AllowedSource.controller) {
    if (scope) {
      if (template.scopes[scope]) {
        template.scopes[scope].forEach(controller => {
          res.push({
            ...basic,
            controller,
          })
        })
      }
    } else {
      template.controllers.forEach(controller => {
        res.push({
          ...basic,
          controller,
        })
      })
    }

    return res
  }

  if (source === AllowedSource.action) {
    if (scope) {
      if (template.scopes[scope]) {
        template.scopes[scope].forEach(controller => {
          controller.actions.forEach(action => {
            if (enableAnnotation && !action.annotation[enableAnnotation]) {
              return
            }

            res.push({
              ...basic,
              controller,
              action,
            })
          })
        })
      }
    } else {
      template.controllers.forEach(controller => {
        controller.actions.forEach(action => {
          if (enableAnnotation && !action.annotation[enableAnnotation]) {
            return
          }

          res.push({
            ...basic,
            controller,
            action,
          })
        })
      })
    }

    return res
  }

  if (source === AllowedSource.request) {
    if (scope) {
      if (template.scopes[scope]) {
        template.scopes[scope].forEach(controller => {
          controller.actions.forEach(action => {
            action.requests.forEach(request => {
              if (enableAnnotation && !request.annotation[enableAnnotation]) {
                return
              }

              res.push({
                ...basic,
                controller,
                action,
                request,
              })
            })
          })
        })
      }
    } else {
      template.controllers.forEach(controller => {
        controller.actions.forEach(action => {
          action.requests.forEach(request => {
            if (enableAnnotation && !request.annotation[enableAnnotation]) {
              return
            }

            res.push({
              ...basic,
              controller,
              action,
              request,
            })
          })
        })
      })
    }

    return res
  }

  if (source === AllowedSource.response) {
    if (scope) {
      if (template.scopes[scope]) {
        template.scopes[scope].forEach(controller => {
          controller.actions.forEach(action => {
            action.responses.forEach(response => {
              if (enableAnnotation && !response.annotation[enableAnnotation]) {
                return
              }

              res.push({
                ...basic,
                controller,
                action,
                response,
              })
            })
          })
        })
      }
    } else {
      template.controllers.forEach(controller => {
        controller.actions.forEach(action => {
          action.responses.forEach(response => {
            if (enableAnnotation && !response.annotation[enableAnnotation]) {
              return
            }

            res.push({
              ...basic,
              controller,
              action,
              response,
            })
          })
        })
      })
    }

    return res
  }

  return [basic]
}

export const getContextsBySource = (
  stubAll: Stub.All,
  source: string | null,
  path: string,
  pipeline: Pipeline,
): RenderContext<Pipeline>[] => {
  const { special, scope } = pipeline
  const specialTemplate = special ? stubAll.specials[special] : null

  if ((special && specialTemplate) || source === AllowedSource.all) {
    return getContextByTemplate(
      stubAll,
      source,
      path,
      pipeline,
      specialTemplate,
      scope
    )
  }

  const res: RenderContext<Pipeline>[] = []

  stubAll.templates.forEach(template => {
    res.push(...getContextByTemplate(
      stubAll,
      source,
      path,
      pipeline,
      template,
      scope
    ))
  })

  return res
}

export const useLiquid = (liquidTemplatePath: string, filters: LiquidFilters) => {
  const liquid = new Liquid({
    root: [
      path.resolve(__dirname + '/../../stubs'),
      path.resolve(liquidTemplatePath),
    ],
    extname: '.liquid',
  });

  liquid.registerFilter('camelcase', (value: string) => {
    return _.camelCase(value)
  })

  liquid.registerFilter('snakecase', (value: string) => {
    return _.snakeCase(value)
  })

  liquid.registerFilter('lcfirst', (value: string) => {
    return _.lowerFirst(value)
  })

  liquid.registerFilter('ucfirst', (value: string) => {
    return _.upperFirst(value)
  })

  // bind filters
  for (const filterName in filters) {
    liquid.registerFilter(filterName, (value: string) => {
      for (const key in filters[filterName]) {
        if (value === key) {
          return filters[filterName][key]
        }
      }

      return value
    })
  }

  return liquid
}

export type LiquidFilters = { [key: string]: { [key: string]: string } }
