import fs from 'fs'
import path from 'path'

export default {
  rm(target: string) {
    fs.rmSync(target, {
      force: true,
      recursive: true
    })
  },
  copyFile(src: string, dest: string) {
    fs.cpSync(src, dest, {
      recursive: true,
      mode: fs.constants.COPYFILE_FICLONE_FORCE,
    })
  },
  rename: fs.renameSync,
  writeFile(target: string, data: string) {
    fs.mkdirSync(path.dirname(target), {
      recursive: true
    })

    fs.writeFileSync(target, data.trimEnd() + '\n', {
      flag: 'w+'
    })
  }
}
