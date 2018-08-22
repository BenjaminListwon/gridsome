const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const chalk = require('chalk')
const Tasks = require('@hjvedvik/tasks')
const { error } = require('@vue/cli-shared-utils')
const sortPackageJson = require('sort-package-json')

module.exports = async (name, starter = 'default') => {
  const dir = path.resolve(process.cwd(), name)
  const starters = ['default', 'wordpress']
  const hasYarn = useYarn()

  if (fs.existsSync(dir)) {
    return error(`Directory «${name}» already exists.`)
  }

  if (starters.includes(starter)) {
    starter = `gridsome/gridsome-starter-${starter}`
  }

  const url = `https://github.com/${starter}.git`

  const tasks = new Tasks([
    {
      title: `Clone ${url}`,
      task: async () => {
        try {
          await exec('git', ['clone', url, dir, '--single-branch'])
          await fs.remove(`${dir}/.git`)
        } catch {
          throw new Error('Failed to clone repository')
        }
      }
    },
    {
      title: 'Update project package.json',
      task: async (_, task) => {
        try {
          await updatePkg(`${dir}/package.json`, { name, private: true })
        } catch (err) {
          task.skip('Failed to update package.json')
        }
      }
    },
    {
      title: `Install dependencies`,
      task: async (_, task) => {
        try {
          if (hasYarn) await exec('yarnpkg')
          else await exec('npm', ['install'])
          task.setSummary(`Installed successfully with ${hasYarn ? 'Yarn' : 'npm'}`)
        } catch (err) {
          task.skip('Failed to install dependencies')
        }
      }
    }
  ])

  try {
    await tasks.run()
  } catch (err) {
    console.log()
    return error(err.message)
  }

  const developCommand = 'gridsome develop'
  const buildCommand = 'gridsome build'

  console.log()
  console.log(`  - Enter directory ${chalk.green(`cd ${name}`)}`)
  console.log(`  - Run ${chalk.green(developCommand)} to start local development`)
  console.log(`  - Run ${chalk.green(buildCommand)} to build for production`)
  console.log()
}

function useYarn () {
  try {
    shellSync('yarnpkg', ['--version'])
    return true
  } catch (e) {
    return false
  }
}

async function updatePkg (pkgPath, obj) {
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
  const newPkg = sortPackageJson(Object.assign(pkg, obj))

  await fs.outputFile(pkgPath, JSON.stringify(newPkg, null, 2))
}

function exec (cmd, args = [], options = { stdio: 'ignore' }) {
  return execa(cmd, args, options)
}

function shellSync (cmd, args = [], options = { stdio: 'ignore' }) {
  return execa.shellSync(cmd, args, options)
}