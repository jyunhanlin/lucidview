import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ['tldraw', '@tldraw/editor', '@tldraw/tlschema', '@tldraw/state', '@tldraw/store', '@tldraw/utils', '@tldraw/validate'],
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'app',
    }),
    viteReact(),
  ],
})
