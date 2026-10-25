const fs = require('node:fs')
const path = require('node:path')

const cliTemplate = path.resolve(__dirname, '../node_modules/@capacitor/cli/dist/util/template.js')
const source = fs.readFileSync(cliTemplate, 'utf8')
const unpatchedImport = 'const tar_1 = tslib_1.__importDefault(require("tar"));'
const compatibleImport = 'const tar_1 = { default: require("tar") };'

if (source.includes(compatibleImport)) {
  process.exit(0)
}

if (!source.includes(unpatchedImport)) {
  throw new Error('Unexpected Capacitor CLI template module; review its tar import before syncing Android.')
}

fs.writeFileSync(cliTemplate, source.replace(unpatchedImport, compatibleImport))
