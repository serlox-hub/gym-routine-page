#!/usr/bin/env node

/**
 * Bump semántico basado en commits convencionales desde el último tag.
 *
 * - feat: → minor
 * - fix/chore/refactor/docs/etc: → patch
 * - BREAKING CHANGE o !: → major
 *
 * Actualiza la versión en:
 * - package.json (root)
 * - apps/web/package.json
 * - apps/gym-native/app.json (expo.version)
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf-8' }).trim()
}

function getLastTag() {
  try {
    return run('git describe --tags --abbrev=0')
  } catch {
    return null
  }
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  const log = run(`git log ${range} --pretty=format:"%s"`)
  return log ? log.split('\n') : []
}

function determineBump(commits) {
  let bump = 'patch'

  for (const msg of commits) {
    if (msg.includes('BREAKING CHANGE') || /^[a-z]+!:/.test(msg)) {
      return 'major'
    }
    if (msg.startsWith('feat')) {
      bump = 'minor'
    }
  }

  return bump
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split('.').map(Number)
  switch (bump) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
  }
}

function updateJsonFile(filePath, updater) {
  const content = JSON.parse(readFileSync(filePath, 'utf-8'))
  updater(content)
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n')
}

// Main
const lastTag = getLastTag()
const commits = getCommitsSince(lastTag)

if (commits.length === 0) {
  console.log('No hay commits nuevos desde el ultimo tag.')
  process.exit(0)
}

const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const currentVersion = rootPkg.version
const bump = determineBump(commits)
const newVersion = bumpVersion(currentVersion, bump)

console.log(`${currentVersion} → ${newVersion} (${bump})`)
console.log(`Commits: ${commits.length}`)

// Actualizar los 3 archivos
updateJsonFile(resolve(root, 'package.json'), (pkg) => {
  pkg.version = newVersion
})

updateJsonFile(resolve(root, 'apps/web/package.json'), (pkg) => {
  pkg.version = newVersion
})

updateJsonFile(resolve(root, 'apps/gym-native/app.json'), (config) => {
  config.expo.version = newVersion
})

console.log(`Actualizado: package.json (root), apps/web/package.json, apps/gym-native/app.json`)
