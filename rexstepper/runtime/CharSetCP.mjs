// Line Terminator Characters
const lineFeedCP           = 10; 
const carriageReturnCP     = 13;
const lineSeparatorCP      = 8232; 
const paragraphSeparatorCP = 8233; 

function getLineTerminators () { 
  return [ lineFeedCP, carriageReturnCP, lineSeparatorCP, paragraphSeparatorCP ]; 
}

//  String Single Character Escape 
const tabCP          = 9;  
const verTabCP       = 11;
const formFeedCP     = 12; 
const spaceCP        = 32; 
const noBreakSpaceCP = 160; 
const byteOrderMark  = 65279;

function getWhiteSpace () { 
  return [ tabCP, verTabCP, formFeedCP, spaceCP, noBreakSpaceCP, byteOrderMark ]; 
}

const a_code   = "a".codePointAt(0); 
const z_code   = "z".codePointAt(0);  
const A_code   = "A".codePointAt(0); 
const Z_code   = "Z".codePointAt(0); 
const _0_code  = "0".codePointAt(0);
const _9_code  = "9".codePointAt(0);
const _us_code = "_".codePointAt(0);

function getWordChars () { 
  var a = []; 

  for (var i = a_code; i <= z_code; i++) { 
    a.push(i)
  }

  for (var i = A_code; i <= Z_code; i++) { 
    a.push(i)
  }
  
  for (var i = _0_code; i <= _9_code; i++) { 
    a.push(i)
  }

  a.push(_us_code)
  return a;   
}



export { getLineTerminators, getWhiteSpace, getWordChars }