'use strict'

const assign = Object.assign


module.exports = sqleton


function all(db, query, params) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

function keys(db, ts) {
  return Promise.all(ts.map(table =>
    all(db, `PRAGMA foreign_key_list('${table.name}')`)
      .then(fk => { table.fk = fk })
      .then(() => table)))
}

function columns(db, ts) {
  return Promise.all(ts.map(table =>
    all(db, `PRAGMA table_info('${table.name}')`)
      .then(cs => { table.columns = cs })
      .then(() => table)))
}

function indexes(db, ts, opts) {
  if (opts.skipIndex) {
    ts.map(table => (table.indexes = []))

    return Promise.resolve(ts)
  }

  return Promise.all(ts.map((table) =>
    all(db, `PRAGMA index_list('${table.name}')`)
      .then(idx => { table.indexes = idx })
      .then(() => table))
  )
}

function tables(db, opts) {
  return all(db,
    'SELECT name FROM sqlite_master ' +
    "WHERE type = 'table' AND name NOT IN ('sqlite_sequence')")
    .then(ts => columns(db, ts))
    .then(ts => keys(db, ts))
    .then((ts) => indexes(db, ts, opts))
}


function quote(value) {
  return (value[0] === '<') ? `<${value}>` : `"${value}"`
}

function attr(attrs, sep, indent) {
  return Object
    .keys(attrs)
    .map(prop => `${indent || ''}${prop}=${quote(attrs[prop])}`)
    .join(sep || ', ')
}

function tag(name, content, options) {
  return (options) ?
    `<${name} ${attr(options, ' ')}>${content}</${name}>` :
    `<${name}>${content}</${name}>`
}

function font(content, options) {
  return tag('font', content, options)
}

function b(content, options) {
  return font(tag('b', content), assign({}, options))
}

//function i(content, options) {
//  return font(tag('i', content), assign({ color: 'grey60' }, options))
//}

function td(content, options) {
  return tag('td', content, assign({
    align: 'left'
  }, options))
}

function tr(tds) {
  return tag('tr', tds.map(args => td(args[0], args[1])).join(''))
}

function tb(trs, options) {
  return tag('table', trs.map(args => tr(args[0])).join(''), assign({
    border: 0, cellspacing: 0.5
  }, options))
}

function head(table) {
  return tb([[[
    [b(table.name, { 'point-size': 13 }), { height: 24, valign: 'bottom' }]
  ]]])
}

function type(column) {
  return [
    (column.type || ' ').toLowerCase()
    // column.dflt_value ? ` [${column.dflt_value}]` : ''
  ].join('')
}

function cols(column) {
  return [[[`${column.name}${column.pk ? '* ' : ' '}${b(type(column))}`]]]
}

function idxs(index) {
  const indexModifiers = [
    index.unique ? 'uniq' : null,
    index.partial ? 'partial' : null
  ].filter(Boolean).join(', ')

  return [[[`${index.name} ${indexModifiers ? `(${b(indexModifiers)})` : ''}`]]]
}

function body(table) {
  const data = [...table.columns.map(cols), ...table.indexes.map(idxs)]

  return tb(data, { width: 134 })
}

function label(table) {
  return `${head(table)}|${body(table)}`
}

function edge(table, fk, options) {
  let labels = options.edgeLabels ?
    { taillabel: fk.from || '', headlabel: fk.to || '' } : {}

  return `${table.name} -> ${fk.table}[${attr(labels)}];`
}

function node(table) {
  let options = { label: label(table) }
  return `${table.name} [${attr(options)}];`
}

function digraph(db, stream, options) {
  return new Promise((resolve, reject) => {
    stream.write(`digraph ${db.name} {\n${attr({
      rankdir: options.direction || 'LR',
      ranksep: '0.8',
      nodesep: '0.6',
      overlap: 'false',
      sep: '+16.0',
      splines: 'compound',
      concentrate: 'true',
      pad: '0.4,0.4',
      fontname: options.font || 'Helvetica',
      fontsize: 12,
      label: b(options.title || db.filename)
    }, ';\n', '  ')};\n`)

    stream.write(`  node[${attr({
      shape: 'Mrecord',
      fontsize: 12,
      fontname: options.font || 'Helvetica',
      margin: '0.07,0.04',
      penwidth: '1.0'
    })}];\n`)

    stream.write(`  edge[${attr({
      arrowsize: '0.8',
      fontsize: 10,
      style: 'solid',
      penwidth: '0.9',
      fontname: options.font || 'Helvetica',
      labelangle: 33,
      labeldistance: '2.0'
    })}];\n`)


    return tables(db, options)
      .then(ts => {
        const nodes = []
        const edges = []

        for (let table of ts) {
          nodes.push(`  ${node(table)}\n`)
          for (let fk of table.fk) {
            edges.push(`  ${edge(table, fk, options)}\n`)
          }
        }

        stream.write(nodes.join('').concat(edges.join(''), '}\n'))

        return ts
      })
      .then(resolve, reject)
  })
}

function sqleton(db, stream, options, cb) {
  const promise =  new Promise((resolve, reject) => {
    digraph(db, stream, options).then(resolve, reject)
  })

  if (cb) {
    promise.then(cb).catch(cb)
  }

  return promise
}
