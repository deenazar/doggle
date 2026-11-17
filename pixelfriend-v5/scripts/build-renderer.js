require('esbuild').buildSync({entryPoints:['renderer/src/model-view.js'],bundle:true,format:'iife',platform:'browser',target:['chrome130'],minify:true,outfile:'renderer/model-view.bundle.js'});
