import { describe, expect, it } from 'vitest'

import { CliArgumentError, parseArgs } from './args.js'

describe('parseArgs', () => {
  it('uses scan and the current directory by default', () => {
    expect(parseArgs([], '/tmp/app')).toMatchObject({
      command: 'scan',
      target: '/tmp/app',
      format: 'pretty',
      course: true
    })
  })

  it('accepts a target and machine-readable options', () => {
    expect(
      parseArgs(
        ['scan', './frontend', '--json', '--ignore=generated,stories', '--max-files', '50'],
        '/tmp/app'
      )
    ).toMatchObject({
      target: '/tmp/app/frontend',
      format: 'json',
      ignore: ['generated', 'stories'],
      maxFiles: 50
    })
  })

  it('accepts the documented command-free path form', () => {
    expect(parseArgs(['frontend'], '/tmp/app')).toMatchObject({
      command: 'scan',
      target: '/tmp/app/frontend'
    })
  })

  it('rejects extra arguments and formats it does not support', () => {
    expect(() => parseArgs(['scan', 'frontend', 'backend'])).toThrow(
      CliArgumentError
    )
    expect(() => parseArgs(['scan', '--format=sarif'])).toThrow(
      'Unsupported format'
    )
  })
})
