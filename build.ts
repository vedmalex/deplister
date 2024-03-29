/// <reference types='bun-types' />
import { createConfig } from './bun.config'
import pkg from './package.json' assert { type: 'json' }

// Create a Bun config from package.json
const config = createConfig({ pkg, outdir: './lib', target: 'node' })

const result = await Bun.build(config)
if (!result.success) {
  throw new AggregateError(result.logs, 'Build failed')
}
