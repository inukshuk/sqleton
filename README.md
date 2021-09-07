# sqleton ['skelɪtən]

Visualizes your SQLite database schema.

![](https://raw.githubusercontent.com/inukshuk/sqleton/master/examples/screenshot.png)

## Installation
```bash
$ npm install -g sqleton
```

You need to install [graphviz](http://www.graphviz.org/) separately:
```bash
$ [pacman -Sy | apt-get install | brew install] graphviz
```

## Example
```bash
$ sqleton -o db.svg db.sqlite
```

The format will be inferred from the name of the output file; you
can use any format supported by `graphviz` (png, pdf, svg, and many more).

## Usage

```
Usage: sqleton [options] <database>

Options:
  -L, --layout      The layout command
      [choices: "neato", "dot", "circo", "fdp", "osage", "sfdp", "twopi"]
                                                         [default: "fdp"]
  -e, --edge-labels Label foreign key edges                     [boolean]
  -t, --title       Optional title string
  -f, --font        The font to use                [default: "Helvetica"]
  -d, --direction   Graph direction [choices: "TB", "LR"] [default: "LR"]
  -o, --out         Output file (determines output format)     [required]
```

## Fine-Tuning

To fine-tune your graph, the best option is to use `.dot` as your output
format and adjust the parameters in the file.

## Node.js
```js
const sqleton = require('sqleton')

// Open your database and writable stream
// ....

sqleton(db, stream, options)
  .then(() => { db.close() })
  .then(() => { stream.end() })
```

## What about PostgreSQL or other databases?

`sqleton` was written to visualize SQLite schemata. Having said that,
you can try to dump your schema and create a new SQLite database for
visualisation from it.

## License

GPL-3.0
