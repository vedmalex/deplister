import { aggregateDependency, processIt } from './process'
import { resolveDependencies } from './resolver'

import path from 'path'
import fs from 'fs'
import { Command, InvalidArgumentError } from 'commander'
const program = new Command()
import yaml from 'yaml'
import glob from 'glob'
const presets = glob
  .sync('*.yaml', {
    cwd: path.join(__dirname, '../presets/'),
  })
  .map(fn => {
    return path.parse(fn).name
  })

function checkPreset(value) {
  if (presets.indexOf(value) == -1) {
    throw new InvalidArgumentError(
      'preset not exists. use `presets` command to get list of available presets',
    )
  }
  return value
}

function checkConfig(value) {
  if (!fs.existsSync(value)) {
    throw new InvalidArgumentError('config not exists')
  }
  return value
}

function getPreset(name) {
  return yaml.parse(
    fs
      .readFileSync(path.join(__dirname, '../presets/', `${name}.yaml`))
      .toString(),
  )
}

program
  .name('deplister')
  .description('list dependency for specified ts(x)/js(x) files')
  .argument('[folder...]', 'folder to deplistering')
  .option('--globals', 'find global variables references')
  .option('--unused', 'find unused variables references')
  .option('--aggregated', 'aggregated results')
  .option('--cleanResult', 'clean result')
  .option('--skipImport', 'skip parse import')
  .option('--preset <preset>', 'preset', checkPreset)
  .option('--config <config>', 'config', checkConfig)
  .option('-y, --yaml', 'output to yaml')
  .option('-f, --filename <name>', 'default filename')
  .option('--allowed <ext...>', 'allowed extenstions')
  .option('--notallowed <ext...>', 'ignored extension in deplistering folders')
  .option('--ignore <folder...>', 'folders to be ignored')
  .version(
    JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
      .version,
  )
  .action(function (folder, options) {
    let localName = process.cwd()
    let config
    if (options.config) {
      const data = fs.readFileSync(options.config).toString()
      if (path.parse(options.config).ext == '.yaml') {
        config = yaml.parse(data)
      } else {
        config = JSON.parse(data)
      }
    } else if (!options.preset) {
      if (fs.existsSync(path.join(localName, 'deplister.config.json'))) {
        config = JSON.parse(
          fs
            .readFileSync(path.join(localName, 'deplister.config.json'))
            .toString(),
        )
      } else if (fs.existsSync(path.join(localName, 'deplister.config.yaml'))) {
        config = yaml.parse(
          fs
            .readFileSync(path.join(localName, 'deplister.config.yaml'))
            .toString(),
        )
      } else {
        config = getPreset('default')
      }
    } else {
      config = getPreset(options.preset)
    }

    if (folder.length > 0) config.include = folder.map(f => `${f}/**/*`)
    if (options.yaml) config.format = 'yaml'
    if (options.aggregated) config.aggregated = true
    if (options.filename) config.filename = options.filename
    if (options.allowed) config.allowed = options.allowed
    if (options.ignore) config.ignore = options.ignore
    if (options.skipImport) config.skipImport = options.skipImport
    if (options.cleanResult) config.cleanResult = options.cleanResult
    if (options.globals) config.globals = options.globals
    if (options.unused) config.unused = options.unused

    let dependencies = processIt(config)
    if (config.aggregated) {
      return aggregateDependency(dependencies)
    } else if (config.cleanResult && !config.aggregated) {
      dependencies = dependencies.filter(r => r.references.length > 0)
    }

    let result =
      config.format == 'yaml'
        ? yaml.stringify(dependencies)
        : JSON.stringify(dependencies, null, 2)

    fs.writeFileSync(`${config.filename}.${config.format}`, result)
  })

program
  .command('init')
  .option('-p, --preset <preset>', 'preset', 'default')
  .option('-j, --json', 'json', false)
  .action(function (options) {
    const config = getPreset(options.preset)
    let result = options.json
      ? JSON.stringify(config, null, 2)
      : yaml.stringify(config)
    fs.writeFileSync(
      `deplister.config.${options.json ? 'json' : 'yaml'}`,
      result,
    )
  })

program.command('presets').action(function () {
  console.log(`list of available presets: \n\t${presets.join('\n\t')}`)
})

program
  .command('resolver')
  .argument('<file>', 'file to resolve')
  .action(function (file) {
    const content = fs.readFileSync(file).toString()
    const data =
      path.parse(file).ext === '.yaml'
        ? yaml.parse(content)
        : JSON.parse(content)

    fs.writeFileSync(
      'requirelist.yaml',
      yaml.stringify(resolveDependencies(data)),
    )
  })

program.parse()
