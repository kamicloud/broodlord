import { Stub, AllowedSource, RenderContext, Pipeline } from '../render'
import _ from 'lodash'
import { Liquid } from 'liquidjs'
import path from 'path'

export const getContextsBySource = (
  stubAll: Stub.All,
  source: string | null,
  path: string,
  pipeline: Pipeline,
): RenderContext[] => {
  const {enable, special} = pipeline
  const specialTemplate = special ? stubAll.specials[special] : null
  const enableAnnotation = enable

  if (source === AllowedSource.tempate) {
    if (special && specialTemplate) {
      return [{
        path,
        all: stubAll,
        template: specialTemplate,
        pipeline,
      }]
    }

    return stubAll.templates.map(template => {
      return {
        path,
        all: stubAll,
        template,
        pipeline,
      }
    })
  }

  if (source === AllowedSource.model) {
    if (special && specialTemplate) {
      return specialTemplate.models.map(model => {
        return {
          path,
          all: stubAll,
          template: specialTemplate,
          model,
          pipeline,
        }
      })
    }

    const res: RenderContext[] = []

    stubAll.templates.forEach(template => {
      template.models.forEach(model => {
        if (enableAnnotation && !model.annotation[enableAnnotation]) {
          return
        }

        res.push({
          path,
          all: stubAll,
          template,
          model,
          pipeline,
        })
      })
    })

    return res
  }

  if (source === AllowedSource.controller) {
    if (special && specialTemplate) {
      return specialTemplate.controllers.map(controller => {
        return {
          path,
          all: stubAll,
          template: specialTemplate,
          controller,
          pipeline,
        }
      })
    }
  }

  if (source === AllowedSource.action) {
    if (special && specialTemplate) {
      const res: RenderContext[] = []

      specialTemplate.controllers.forEach(controller => {
        controller.actions.forEach(action => {
          res.push({
            path,
            all: stubAll,
            template: specialTemplate,
            controller,
            action,
            pipeline,
          })
        })
      })

      return res
    }
  }

  return [{
    path,
    all: stubAll,
    pipeline,
  }]
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
