import { openSync, readSync, writeSync, closeSync } from 'node:fs'

const exePath = process.argv[2]
const subsystemVal = parseInt(process.argv[3] || '3', 10) // 3 = Console, 2 = GUI

const fd = openSync(exePath, 'r+')
const buf = Buffer.alloc(1024)
readSync(fd, buf, 0, 1024, 0)

const peOffset = buf.readUInt32LE(0x3c)
const magic = buf.readUInt16LE(peOffset + 24)
const is64 = magic === 0x20b
const subsystemOffset = peOffset + 24 + (is64 ? 68 : 68)

const current = buf.readUInt16LE(subsystemOffset)
console.log(`Setting subsystem in ${exePath}: current=${current} -> target=${subsystemVal}`)

const writeBuf = Buffer.alloc(2)
writeBuf.writeUInt16LE(subsystemVal, 0)
writeSync(fd, writeBuf, 0, 2, subsystemOffset)
closeSync(fd)
