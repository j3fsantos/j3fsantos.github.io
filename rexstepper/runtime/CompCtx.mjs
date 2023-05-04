const FLAGS = [ 'm', 'i', 'g' ]; 

// we need the accessors of the context!!!!!!

function multiline(ctx) {
  return ctx.flags.m;
}

function ignoreCase(ctx) {
  return ctx.flags.i;
}

function global(ctx) {
  return ctx.flags.g;
}

function newCtx (re, nCaps) { 
  var ctx    = {};  
  var flags  = re.flags; 
  var rflags = {};
  for (var i = 0; i<FLAGS.length; i++) { 
    rflags[FLAGS[i]] = flags.includes(FLAGS[i]); 
  }

  ctx.flags  = rflags;  
  ctx.parens = { parenIndex: 0, parenCount: 0 };
  
  ctx.nCaps  = nCaps;
  
  return ctx;
}

function ctx2str (ctx) { 
  return JSON.stringify(ctx); 
}

function incrParenIndex (ctx) {
  ctx.parens.parenIndex++
}

function incrParenCount (ctx) {
  ctx.parens.parenCount++
}

function decrParenCount (ctx) {
  ctx.parens.parenCount--
}

function getParenIndex (ctx) { 
  return ctx.parens.parenIndex; 
}

function getParenCount (ctx) { 
  return ctx.parens.parenCount; 
}

function getNCaps (ctx) {
  return ctx.nCaps;
}

export { newCtx, ctx2str, multiline, ignoreCase, global, incrParenIndex, incrParenCount, decrParenCount, getParenIndex, getParenCount, getNCaps };