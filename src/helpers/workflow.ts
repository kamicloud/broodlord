import fs from 'node:fs'
import path from 'node:path'

export const pushRenderPathsToList = (list: string[], renderPath: string) => {
  const customRenderFiles = fs.readdirSync(renderPath)

  customRenderFiles.forEach((customRenderFile: string) => {
    if (!customRenderFile.startsWith('render-') || !customRenderFile.endsWith('.ts')) {
      return
    }

    const customRenderPath = path.resolve(renderPath, customRenderFile)

    const customRender = require(customRenderPath)

    if (!customRender || !customRender.default) {
      return
    }

    list.push(customRenderPath)
  })
}
