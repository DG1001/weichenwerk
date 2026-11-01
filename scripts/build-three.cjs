const {buildSync}=require('../artifacts/routing-vendor/node_modules/esbuild');
const {resolve}=require('node:path');
const {copyFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),three=resolve(root,'artifacts/routing-vendor/node_modules/three');
buildSync({entryPoints:[resolve(three,'build/three.module.js')],outfile:resolve(root,'src/vendor/three-0.164.1.min.js'),
  bundle:true,minify:true,format:'iife',globalName:'ThreeLibrary',platform:'browser',target:'es2020',legalComments:'inline',
  banner:{js:'/*! Three.js 0.164.1 | MIT license | see three-LICENSE.txt */'}});
copyFileSync(resolve(three,'LICENSE'),resolve(root,'src/vendor/three-LICENSE.txt'));
console.log('Built local Three.js 0.164.1 (classic script for file://, no CDN).');
