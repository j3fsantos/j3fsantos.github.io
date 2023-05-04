import * as fs from 'fs';
import * as path from 'path'; 
import { ast2str, chopExtension } from './src/runtime/utils.js';
import { compileJS } from './src/JSCompiler/JSCompiler.mjs'; 

import esprima from 'esprima';
const { parse } = esprima;

import { tmpl_imports, harness_import, native_flag_setting } from './src/templates/imports.mjs'

const SUFFIX       = "_compiled.mjs"; 
var fileToCompile  = process.argv[2]; 
var outDir         = process.argv[3];
var outputFile     = chopExtension(path.basename(fileToCompile)) + SUFFIX; 
var outputFolder   = path.dirname(fileToCompile).replace(/\//g, "_"); 
var outputFilePath = (outputFolder === ".") ? outDir + "/" + outputFile 
                                            : outDir + "/" + outputFolder + "_" + outputFile; 

// console.log(`outDir: ${outDir}, outputFile: ${outputFile}, outputFolder: ${outputFolder}, outputFilePath: ${outputFilePath}`); 

fs.readFile(fileToCompile, 'utf8', compileFile);

function compileFile(err, prog) { 
  if (err) { 
    console.log("Could not read file: " + err);
    process.exit(1);  
  }
  
  var prog_ast   = parse (prog); 
  var c_prog     = compileJS(prog_ast); 

  var c_prog_str = ast2str(c_prog); 

  var imports = isTest262() ? tmpl_imports + harness_import + native_flag_setting : tmpl_imports +  native_flag_setting; 
  c_prog_str     = imports + "\n\n" + c_prog_str; 
  
  fs.writeFile(outputFilePath, c_prog_str, function(err) {
    if(err) {
      console.log("Could not write file: " + err);
      process.exit(1);  
    }
  }); 
}

function isTest262() {
  var args = process.argv.length;
  for (var i = 0; i < args; i++) {
    if (process.argv[i] == "--test262") {
      return true;
    }
  }
}
