import z from 'zod'
import { themeStyleSchema } from './schema'

export type ThemeStyleOptions = z.infer<typeof themeStyleSchema>
export type ThemeStyle = Required<ThemeStyleOptions>
