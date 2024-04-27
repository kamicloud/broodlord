import { AllowedSource, RenderContext, Pipeline } from '../render'
import { Stub } from '../stub'
import _ from 'lodash'
import { Liquid } from 'liquidjs'
import path from 'path'

const getContextByTemplate = (
  stubAll: Stub.All,
  source: string | null,
  path: string,
  pipeline: Pipeline,
  template: Stub.Template
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

  if (source === AllowedSource.template) {
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

  if (source === AllowedSource.controller) {
    template.controllers.forEach(controller => {
      res.push({
        ...basic,
        controller,
      })
    })

    return res
  }

  if (source === AllowedSource.action) {
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
  const { special } = pipeline
  const specialTemplate = special ? stubAll.specials[special] : null

  if (special && specialTemplate) {
    return getContextByTemplate(
      stubAll,
      source,
      path,
      pipeline,
      specialTemplate,
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
