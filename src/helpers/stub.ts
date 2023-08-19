import { Stub, AllowedSource, RenderContext, Pipeline } from '../render'
import _ from 'lodash'
import { Liquid } from 'liquidjs'
import path from 'path'

const getContextByTemplate = (
  stubAll: Stub.All,
  source: string | null,
  path: string,
  pipeline: Pipeline,
  template: Stub.Template
): RenderContext[] => {
  const { enable } = pipeline
  const enableAnnotation = enable

  const basic = {
    path,
    all: stubAll,
    template,
    pipeline,
  }

  if (source === AllowedSource.tempate) {
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
    const res: RenderContext[] = []

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
    const res: RenderContext[] = []

    template.controllers.forEach(controller => {
      res.push({
        ...basic,
        controller,
      })
    })

    return res
  }

  if (source === AllowedSource.action) {
    const res: RenderContext[] = []

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
): RenderContext[] => {
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

  const res: RenderContext[] = []

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
    root: path.resolve(liquidTemplatePath),
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
