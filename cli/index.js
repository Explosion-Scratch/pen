#!/usr/bin/env node

import { handleCliInput } from './router.js'

handleCliInput(process.argv.slice(2))
