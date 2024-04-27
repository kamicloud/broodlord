import {getTemplate} from '../src/parser'
import fs from 'fs'

const generatedStandardMode = true;
const dir = generatedStandardMode ? `${__dirname}/expected` : `${__dirname}/results`;
const testcasesPath = __dirname + '/testcases';

const testcasesFileNames = fs.readdirSync(testcasesPath)

testcasesFileNames.forEach(testcasesFileName => {
  if (testcasesFileName.indexOf('.ts') === -1) {
    return
  }

  const fileName = testcasesFileName.split('.')[0]

  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {
      force: true,
      recursive: true
    })
  }

  fs.mkdirSync(dir)

  fs.writeFileSync(dir + `/${fileName}.json`, JSON.stringify(getTemplate(testcasesPath, fileName), null, 2) + '\n', {
    flag: 'w+'
  })
})
