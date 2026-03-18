#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const deprecatedEnvPath = path.resolve(__dirname, '..', 'functions', '.env')

if (fs.existsSync(deprecatedEnvPath)) {
  console.error(
    [
      'Refusing to deploy while functions/.env exists.',
      'Firebase deploys functions/.env values to production.',
      'Move local development values to functions/.env.local and retry.',
    ].join('\n')
  )
  process.exit(1)
}
