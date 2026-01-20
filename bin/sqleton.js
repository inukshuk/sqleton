#!/usr/bin/env node

'use strict'

const process = require('node:process')
const spawn = require('node:child_process').spawn
const { parseArgs } = require('node:util')
const Database = require('better-sqlite3')
const { extname, basename } = require('node:path')
const open = require('node:fs').createWriteStream
const sqleton = require('../index.js')
const { version } = require('../package.json')

const L = ['neato', 'dot', 'circo', 'fdp', 'osage', 'sfdp', 'twopi']
const D = ['TB', 'LR']

function usage (code = 0) {
  console.log(`Usage: sqleton [options] <db-file>

Options:
  -h, --help        Print this help text and exit
  -v, --version     Print program version and exit
  -L, --layout      The layout command, one of:
                      "neato", "dot", "circo",
                      "fdp" (default),
                      "osage", "sfdp", "twopi"
                              
  -e, --edge-labels  Label foreign key edges
  -t, --title        Optional title string
  -f, --font         The font to use, by default "Helvetica"
  -d, --direction    Graph direction, "TB" or "LR" (default)
  -o, --out          Output file (determines output format),
                     if not given DOT will be printed to stdout

      --skip-index   Skip writing table indexes`)

  process.exit(code)
}

function fail (error) {
  if (error) {
    console.error(error.stack)
  }
  process.exit(1)
}

function parse () {
  try {
    const { values, positionals } = parseArgs({
      allowNegative: true,
      allowPositionals: true,
      strict: true,
      options: {
        layout: {
          type: 'string',
          short: 'L',
          default: 'fdp'
        },
        'edge-labels': {
          type: 'boolean',
          short: 'e'
        },
        'skip-index': {
          type: 'boolean'
        },
        title: {
          type: 'string',
          short: 't'
        },
        font: {
          type: 'string',
          short: 'f',
          default: 'Helvetica'
        },
        direction: {
          type: 'string',
          short: 'd',
          default: 'LR'
        },
        out: {
          type: 'string',
          short: 'o',
        },
        help: {
          type: 'boolean',
          short: 'h'
        },
        version: {
          type: 'boolean',
          short: 'v'
        }
      }
    })

    if (values.help) {
      usage()
    }
    if (values.version) {
      console.log(`v${version}`)
      process.exit(0)
    }

    if (positionals.length !== 1) {
      throw new Error('please provide exactly one db file')
    }
    if (!L.includes(values.layout)) {
      throw new Error(`unknown layout: '${values.layout}`)
    }
    if (!D.includes(values.direction)) {
      throw new Error(`unknown direction: '${values.direction}`)
    }

    if (!values.title) {
      values.title = basename(positionals[0])
    }

    const path = positionals[0]
    const name = basename(path, extname(path))
    const format = values.out
      ? extname(values.out).slice(1)
      : 'dot'

    return {
      ...values,
      format,
      path,
      name
    }
  } catch (error) {
    console.error(error.message)
    usage(1)
  }
}

const opts = parse()

let db
try {
  db = new Database(opts.path, { readonly: true })
} catch (error) {
  fail(error)
}

let stream

if (opts.format !== 'dot') {
  const proc = spawn(opts.layout, [`-T${opts.format}`, `-o${opts.out}`])
  proc.stderr.pipe(process.stderr)
  stream = proc.stdin
} else {
  stream = opts.out
    ? open(opts.out, { autoClose: true })
    : process.stdout
}

sqleton(db, stream, opts)
  .then(() => { db.close() })
  .then(() => { stream.end() })
  .catch(fail)
