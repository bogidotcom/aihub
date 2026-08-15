// Must be the FIRST import of the entry point — ESM hoists imports, so .env
// has to be loaded in its own module before any sibling module reads process.env.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
try { process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env')) } catch { /* no .env */ }
