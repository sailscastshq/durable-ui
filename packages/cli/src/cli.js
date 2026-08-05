import { readFile } from 'node:fs/promises'

import { CliArgumentError, parseArgs } from './args.js'
import { formatReport } from './format.js'
import { scanProject } from './scanner.js'

export async function runCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout
  const stderr = io.stderr || process.stderr
  const cwd = io.cwd || process.cwd()

  try {
    const options = parseArgs(argv, cwd)

    if (options.help) {
      stdout.write(helpText)
      return 0
    }

    const version = await readVersion()
    if (options.version) {
      stdout.write(`${version}\n`)
      return 0
    }

    const report = await scanProject(options.target, {
      ignore: options.ignore,
      maxFiles: options.maxFiles,
      scannerVersion: version
    })
    stdout.write(
      formatReport(report, {
        course: options.course,
        format: options.format,
        stream: stdout
      })
    )
    return 0
  } catch (error) {
    if (error instanceof CliArgumentError) {
      stderr.write(`durable-ui: ${error.message}\nRun durable-ui --help for usage.\n`)
      return 1
    }

    if (error?.code === 'ENOENT') {
      stderr.write(`durable-ui: path not found: ${error.path}\n`)
      return 1
    }

    stderr.write(`durable-ui: scan failed: ${error.message}\n`)
    return 1
  }
}

async function readVersion() {
  const packageUrl = new URL('../package.json', import.meta.url)
  const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'))
  return packageJson.version
}

const helpText = `Durable UI scanner

Usage
  durable-ui scan [path] [options]
  durable-ui [path] [options]

Options
  --json                 Print machine-readable JSON
  --format <pretty|json> Choose an output format
  --ignore <names>       Ignore comma-separated directory names
  --max-files <number>   Limit source files scanned (default: 10000)
  --no-course            Hide the course invitation
  -h, --help             Show help
  -v, --version          Show version

Examples
  npx durable-ui scan
  npx durable-ui scan ./resources/js
  npx durable-ui scan --json > durable-ui-report.json

The scanner reports static signals, not verdicts. Reproduce every finding in
the browser before changing a product contract.
`
