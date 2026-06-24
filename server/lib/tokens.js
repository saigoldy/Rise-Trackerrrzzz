const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '../.tokens.json')

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) }
  catch { return {} }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

module.exports = {
  get: (platform) => load()[platform] ?? null,
  set: (platform, value) => { const d = load(); d[platform] = value; save(d) },
  remove: (platform) => { const d = load(); delete d[platform]; save(d) },
  all: () => load(),
}
