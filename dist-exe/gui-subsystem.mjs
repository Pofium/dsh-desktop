// Patch a PE32/PE32+ executable from console (3) to Windows GUI (2) subsystem.
// Usage: node gui-subsystem.mjs <file.exe>
import { open } from 'node:fs/promises'

const path = process.argv[2]
if (!path) throw new Error('usage: node gui-subsystem.mjs <file.exe>')

const fh = await open(path, 'r+')
try {
  const dos = Buffer.alloc(64)
  await fh.read(dos, 0, 64, 0)
  if (dos.readUInt16LE(0) !== 0x5a4d) throw new Error('not a PE file (MZ missing)')
  const peOffset = dos.readUInt32LE(0x3c)

  const sig = Buffer.alloc(4)
  await fh.read(sig, 0, 4, peOffset)
  if (sig.readUInt32LE(0) !== 0x00004550) throw new Error('PE signature missing')

  // Optional header starts at peOffset + 4 (sig) + 20 (file header); Subsystem is at +68.
  const optOffset = peOffset + 24
  const magic = Buffer.alloc(2)
  await fh.read(magic, 0, 2, optOffset)
  const m = magic.readUInt16LE(0)
  if (m !== 0x10b && m !== 0x20b) throw new Error(`unexpected optional header magic 0x${m.toString(16)}`)

  const subOffset = optOffset + 68
  const cur = Buffer.alloc(2)
  await fh.read(cur, 0, 2, subOffset)
  const current = cur.readUInt16LE(0)
  if (current === 2) {
    console.log(`${path}: already GUI subsystem`)
  } else {
    if (current !== 3) throw new Error(`unexpected subsystem ${current}, expected console (3)`)
    const patch = Buffer.alloc(2)
    patch.writeUInt16LE(2, 0)
    await fh.write(patch, 0, 2, subOffset)
    console.log(`${path}: subsystem console(3) -> windows GUI(2)`)
  }
} finally {
  await fh.close()
}
