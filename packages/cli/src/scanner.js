import { readFile, readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

import { collectPositiveSignals, inspectSource } from './rules.js'

const sourceExtensions = new Set([
  '.astro',
  '.cjs',
  '.ejs',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.svelte',
  '.ts',
  '.tsx',
  '.vue'
])

const defaultIgnoredDirectories = new Set([
  '.git',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '.turbo',
  '.vite',
  'build',
  'coverage',
  'dist',
  'fixtures',
  'node_modules',
  'out',
  'public',
  'storybook-static',
  'test',
  'tests',
  '__tests__',
  'vendor'
])

const maxSourceBytes = 1024 * 1024

export async function scanProject(target, options = {}) {
  const startedAt = performance.now()
  const resolvedTarget = await realpath(path.resolve(target))
  const targetStat = await stat(resolvedTarget)
  const root = targetStat.isDirectory() ? resolvedTarget : path.dirname(resolvedTarget)
  const ignoredDirectories = new Set([
    ...defaultIgnoredDirectories,
    ...(options.ignore || [])
  ])
  const maxFiles = options.maxFiles || 10_000
  const filePaths = targetStat.isDirectory()
    ? await walk(root, { ignoredDirectories, maxFiles })
    : [resolvedTarget]
  const files = []
  const skipped = []

  for (const filePath of filePaths) {
    const fileStat = await stat(filePath)
    if (fileStat.size > maxSourceBytes) {
      skipped.push(path.relative(root, filePath))
      continue
    }

    const source = await readFile(filePath, 'utf8')
    files.push({
      absolutePath: filePath,
      relativePath: normalizePath(path.relative(root, filePath) || path.basename(filePath)),
      source
    })
  }

  const findings = files
    .flatMap(inspectSource)
    .sort(compareFindings)
  const frameworks = await detectFrameworks(root, files)
  const elapsedMs = Math.round(performance.now() - startedAt)

  return {
    schemaVersion: 1,
    scannerVersion: options.scannerVersion || '0.0.1',
    root,
    frameworks,
    filesScanned: files.length,
    filesSkipped: skipped,
    elapsedMs,
    summary: summarize(findings),
    positiveSignals: collectPositiveSignals(files),
    findings
  }
}

async function walk(root, options) {
  const files = []

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (files.length >= options.maxFiles) return
      if (entry.name.startsWith('.') && entry.isDirectory()) {
        if (options.ignoredDirectories.has(entry.name)) continue
      }

      const entryPath = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        if (!options.ignoredDirectories.has(entry.name)) await visit(entryPath)
        continue
      }

      if (
        entry.isFile() &&
        !isTestFile(entry.name) &&
        sourceExtensions.has(path.extname(entry.name).toLowerCase())
      ) {
        files.push(entryPath)
      }
    }
  }

  await visit(root)
  return files
}

async function detectFrameworks(root, files) {
  let packageJson = null
  try {
    packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  } catch {
    // A source folder or single file can still be scanned without package metadata.
  }

  const dependencies = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {})
  }
  const sourceNames = files.map((file) => file.relativePath)
  const detected = []

  addFramework(detected, 'React', Boolean(dependencies.react) || hasExtension(sourceNames, '.jsx', '.tsx'))
  addFramework(detected, 'Vue', Boolean(dependencies.vue) || hasExtension(sourceNames, '.vue'))
  addFramework(detected, 'Svelte', Boolean(dependencies.svelte) || hasExtension(sourceNames, '.svelte'))
  addFramework(detected, 'Inertia', Boolean(dependencies['@inertiajs/react'] || dependencies['@inertiajs/vue3']))
  addFramework(detected, 'Next.js', Boolean(dependencies.next))
  addFramework(detected, 'Nuxt', Boolean(dependencies.nuxt))
  addFramework(detected, 'Sails', Boolean(dependencies.sails))

  return detected
}

function addFramework(frameworks, name, condition) {
  if (condition) frameworks.push(name)
}

function hasExtension(files, ...extensions) {
  return files.some((file) => extensions.includes(path.extname(file)))
}

function isTestFile(fileName) {
  return /\.(?:spec|test)\.[^.]+$/i.test(fileName)
}

function summarize(findings) {
  return findings.reduce(
    (summary, finding) => {
      summary.total += 1
      summary[finding.severity] += 1
      return summary
    },
    { total: 0, high: 0, medium: 0, review: 0 }
  )
}

function compareFindings(a, b) {
  const order = { high: 0, medium: 1, review: 2 }
  return (
    order[a.severity] - order[b.severity] ||
    a.file.localeCompare(b.file) ||
    a.line - b.line
  )
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}
