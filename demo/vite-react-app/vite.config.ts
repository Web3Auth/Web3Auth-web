import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { url } from 'inspector'

export default defineConfig({
    // depending on your application, base can also be "/"
    base: '',
    plugins: [react(),   
    nodePolyfills({ include: ['crypto', 'stream', 'assert', 'http', 'https', 'os', 'url', 'zlib'] })],
    server: {    
        // this ensures that the browser opens upon server start
        open: true,
        // this sets a default port to 3000  
        port: 3000, 
    },

})