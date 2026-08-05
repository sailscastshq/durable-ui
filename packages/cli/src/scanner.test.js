import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { scanProject } from './scanner.js'

describe('scanProject', () => {
  it('scans application sources and omits tests and generated folders', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'durable-ui-'))
    await mkdir(path.join(root, 'src'))
    await mkdir(path.join(root, 'dist'))
    await writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ dependencies: { react: '^19.0.0' } })
    )
    await writeFile(
      path.join(root, 'src', 'Tabs.jsx'),
      `const [activeTab, setActiveTab] = useState('details')`
    )
    await writeFile(
      path.join(root, 'src', 'Tabs.test.jsx'),
      `localStorage.setItem('fake', 'test')`
    )
    await writeFile(
      path.join(root, 'dist', 'bundle.js'),
      `localStorage.setItem('generated', 'bundle')`
    )

    const report = await scanProject(root)

    expect(report.filesScanned).toBe(1)
    expect(report.frameworks).toContain('React')
    expect(report).not.toHaveProperty('courseUrl')
    expect(report.findings.map((finding) => finding.id)).toEqual([
      'view-state-outside-url'
    ])
  })

  it('can scan a single source file', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'durable-ui-file-'))
    const sourcePath = path.join(root, 'auth.js')
    await writeFile(sourcePath, `redirect('/sign-in')`)

    const report = await scanProject(sourcePath)

    expect(report.filesScanned).toBe(1)
    expect(report.findings[0]).toMatchObject({
      id: 'auth-redirect-loses-intent',
      file: 'auth.js',
      line: 1
    })
  })
})
