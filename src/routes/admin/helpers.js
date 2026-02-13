/* eslint-disable import/prefer-default-export */
import { readFileSync } from 'fs'

export const bufferFromPath = (path) => readFileSync(path)
