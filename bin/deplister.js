#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const { collectDependencies } = require('../lib/index')
const { Command } = require('commander')
const program = new Command()

program
  .name('deplist')
  .description('list dependency for specified ts(x)/js(x) files')
  .version(
    JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
      .version,
  )

program
  .command('json')
  .argument('<folder>', 'templates root folder', './src')
  .argument('[dest]', 'destination file', 'deplist.json')
  .action(function (folder, dest) {
    const glob = require('glob')
    const files = glob.sync(`${folder}/**/*.@(ts|js|tsx|jsx)`)
    const dependencies = collectDependencies(files, folder)
    fs.writeFileSync(dest, JSON.stringify(dependencies))
  })

program.parse()
