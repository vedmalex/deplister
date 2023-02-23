#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const { collectDependencies } = require('../lib/index')
const { Command } = require('commander')
const program = new Command()
const yaml = require('yaml')

const filepattern = '/**/*.@(ts|js|tsx|jsx)'

program
  .name('deplist')
  .description('list dependency for specified ts(x)/js(x) files')
  .argument('[folder]', 'glog for root folder', './')
  .option('-j, --json', 'output to json file', false)
  .option('-y, --yaml', 'output to toml file', false)
  .option('-f, --filename <name>', 'output filename', 'deplister')
  .option('--allowed <ext...>', 'allowed extensions')
  .option('--notallowed <ext...>', 'ignored extensions')
  .option('--ignore <folder...>', 'exclude golder', '')
  .option('--include <folder...>', 'include folder', '')
  .version(
    JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
      .version,
  )
  .action(function (folder, options) {
    if (fs.existsSync('deplister.config.json')) {
    }
    const glob = require('glob')
    let gl
    if (options.ignore) {
      gl = {
        igonore: `${options.ignore}${
          options.notallowed
            ? `/**/*.@(${options.notallowed.join('|')})`
            : filepattern
        }`,
      }
    }

    const files = options.include
      ? glob.sync(
          `${options.include}${
            options.allowed
              ? `/**/*.@(${options.allowed.join('|')})`
              : filepattern
          }`,
          gl,
        )
      : glob.sync(
          path.join(
            folder ?? '.',
            options.allowed
              ? `/**/*.@(${options.allowed.join('|')})`
              : filepattern,
          ),
          gl,
        )
    const dependencies = collectDependencies(files, folder)
    let result
    let ext
    if (options.json) {
      ext = '.json'
      result = JSON.stringify(dependencies, null, 2)
    } else if (options.yaml) {
      ext = '.yaml'
      result = yaml.stringify(dependencies)
    } else {
      ext = '.json'
      result = JSON.stringify(dependencies)
    }
    fs.writeFileSync(`${options.filename}${ext}`, result)
  })

program.command('init').action(function () {
  fs.writeFileSync('deplister.config.toml', JSON.stringify({}))
})

program.parse()
