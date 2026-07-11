import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
fs.mkdirSync(dist, { recursive: true })

const files = [
  'FlLumex_Override.js',
  'Lumex/Lumex.js',
  'Stash_Override.js',
  'Stash.stoverride',
  'IosStash/Stash_Override.stoverride'
]
const artifacts = files.filter((file) => fs.existsSync(path.join(root, file))).map((file) => {
  const data = fs.readFileSync(path.join(root, file))
  return { path: file.replaceAll('\\', '/'), bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') }
})
const manifest = {
  schemaVersion: 'lumex.profile-manifest/v1',
  generatedAt: new Date().toISOString(),
  compatibility: { lumex: '>=1.9.6', lumexCore: '>=1.19.0', forbiddenCapabilities: ['mihomo-smart'] },
  artifacts
}
const encoded = `${JSON.stringify(manifest, null, 2)}\n`
fs.writeFileSync(path.join(dist, 'manifest.json'), encoded, 'utf8')

const privateKey = process.env.LUMEX_PROFILE_SIGNING_KEY_PEM
if (privateKey) {
  const signature = crypto.sign(null, Buffer.from(encoded), privateKey).toString('base64')
  fs.writeFileSync(path.join(dist, 'manifest.sig'), `${signature}\n`, 'utf8')
  console.log(`[manifest] signed ${artifacts.length} artifacts`)
} else {
  console.log(`[manifest] built ${artifacts.length} artifacts (unsigned; set LUMEX_PROFILE_SIGNING_KEY_PEM to sign)`)
}
