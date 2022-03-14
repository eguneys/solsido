import { nodeResolve } from '@rollup/plugin-node-resolve'

//import typescript from '@rollup/plugin-typescript'
import babel from '@rollup/plugin-babel'
import css from 'rollup-plugin-import-css'

import htmlTemplate from 'rollup-plugin-generate-html-template'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

import { terser }  from 'rollup-plugin-terser'

let extensions = ['.ts', '.tsx']

export default args => {
  let prod = args['config-prod']

  return {
    input: 'src/main.ts',
    output: {
      format: 'iife',
      name: 'Solsido',
      dir: 'dist',
      ...(prod ? {
        entryFileNames: '[name].min.js',
        plugins: [terser({mangle: { properties: { keep_quoted: true } } })]
      } : { sourcemap: true })
    },
    watch: {
      clearScreen: true
    },
    plugins: [
      nodeResolve({ extensions, browser: true }),
      babel({ extensions, babelHelpers: 'bundled' }),
      //typescript(),
      css(),
      htmlTemplate({
        template: 'src/index.html',
        target: 'index.html'
      }),
      ...(prod? [] : [
        serve({ contentBase: 'dist', port: 3000 }),
        livereload({ watch: 'dist', port: 8080 })
      ])
    ]

  }
}