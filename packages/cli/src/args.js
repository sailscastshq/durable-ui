import path from 'node:path'

const defaultMaxFiles = 10_000

export function parseArgs(argv, cwd = process.cwd()) {
  const args = [...argv]
  const options = {
    command: 'scan',
    course: true,
    format: 'pretty',
    help: false,
    ignore: [],
    maxFiles: defaultMaxFiles,
    target: cwd,
    version: false
  }

  if (args[0] === 'scan') args.shift()

  let targetWasSet = false

  while (args.length > 0) {
    const argument = args.shift()

    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }

    if (argument === '--version' || argument === '-v') {
      options.version = true
      continue
    }

    if (argument === '--json') {
      options.format = 'json'
      continue
    }

    if (argument === '--no-course') {
      options.course = false
      continue
    }

    if (argument === '--format') {
      options.format = readValue(argument, args)
      continue
    }

    if (argument.startsWith('--format=')) {
      options.format = argument.slice('--format='.length)
      continue
    }

    if (argument === '--ignore') {
      options.ignore.push(...splitList(readValue(argument, args)))
      continue
    }

    if (argument.startsWith('--ignore=')) {
      options.ignore.push(...splitList(argument.slice('--ignore='.length)))
      continue
    }

    if (argument === '--max-files') {
      options.maxFiles = parsePositiveInteger(readValue(argument, args), argument)
      continue
    }

    if (argument.startsWith('--max-files=')) {
      options.maxFiles = parsePositiveInteger(
        argument.slice('--max-files='.length),
        '--max-files'
      )
      continue
    }

    if (argument.startsWith('-')) {
      throw new CliArgumentError(`Unknown option: ${argument}`)
    }

    if (targetWasSet) {
      throw new CliArgumentError(`Unexpected argument: ${argument}`)
    }

    options.target = path.resolve(cwd, argument)
    targetWasSet = true
  }

  if (!['pretty', 'json'].includes(options.format)) {
    throw new CliArgumentError(
      `Unsupported format: ${options.format}. Use "pretty" or "json".`
    )
  }

  options.ignore = [...new Set(options.ignore)]
  return options
}

export class CliArgumentError extends Error {}

function readValue(option, args) {
  const value = args.shift()
  if (!value || value.startsWith('-')) {
    throw new CliArgumentError(`${option} requires a value.`)
  }
  return value
}

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePositiveInteger(value, option) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) {
    throw new CliArgumentError(`${option} must be a positive integer.`)
  }
  return number
}
