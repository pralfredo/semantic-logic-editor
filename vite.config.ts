import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the repo name so asset URLs resolve on GitHub Pages:
// https://pralfredo.github.io/semantic-logic-editor/
export default defineConfig({
  plugins: [react()],
  base: '/semantic-logic-editor/',
})
