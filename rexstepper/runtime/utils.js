/*
import escodegen from 'escodegen';
const { generate } = escodegen;
import esprima from 'esprima';
const { parse } = esprima;
*/

import { generate } from "escodegen";
import { parse } from "esprima";

function ast2str(e) {
    try {
        const option = {
            format: {
                quotes: "single",
                indent: {
                    style: "\t",
                },
            },
        };
        return generate(e, option);
    } catch (err) {
        if (typeof e === "object") {
            console.log("converting the following ast to str:\n" + e);
        } else {
            console.log("e is not an object!!!");
        }
        throw "ast2str failed.";
    }
}

function str2ast(str) {
    var ast = parse(str);
    return ast.body[0].expression;
}

function copyFrom(to, from) {
    if (from === null) return;
    for (var prop in from) {
        if (from.hasOwnProperty(prop)) {
            to[prop] = from[prop];
        }
    }
}

function int2str(i) {
    return i + "";
}

function bool2str(b) {
    return (b === true) + "";
}

function stringMap(f, str, f_args) {
    var ret = "";
    for (var i = 0; i < str.length; i++) {
        ret += f(str[i], ...f_args);
    }
    return ret;
}

function boolXor(b1, b2) {
    return (b1 && !b2) || (b2 && !b1);
}

function chopExtension(str) {
    var i = str.lastIndexOf(".");
    return str.substring(0, i);
}

function isCallable(v) {
    return typeof v === "function";
}

function isPrimitive(v) {
    switch (typeof v) {
        case "undefined":
        case "boolean":
        case "number":
        case "string":
            return true;
        case "object":
            if (v === null) {
                return true;
            } else {
                return false;
            }
        case "function":
            return false;
    }
}

function defaultValueWithHintNumber(o) {
    var valueOf = o.valueOf;
    var val;
    if (isCallable(valueOf)) {
        val = o.valueOf();
    }
    if (isPrimitive(val)) {
        return val;
    }
    var toString = o.toString;
    var str;
    if (isCallable(toString)) {
        str = o.toString();
    }
    if (isPrimitive(str)) {
        return str;
    }
    throw new TypeError(`defaultValueWithHintNumber: ${JSON.stringify(o)}`);
}

function toNumber(x) {
    switch (typeof x) {
        case "undefined":
            return NaN;
        case "boolean":
            if (x) {
                return 1;
            } else {
                return 0;
            }
        case "number":
            return x;
        case "string":
            return parseFloat(x);
        case "object":
            if (x === null) {
                return 0;
            } else {
                var primValue = defaultValueWithHintNumber(x);
                return toNumber(primValue);
            }
        default:
            throw new Error(`toNumber: ${x}`);
    }
}

function isNaN(x) {
    return typeof x === "number" && x !== x;
}

function sign(x) {
    if (x > 0) {
        return 1;
    } else if (x < 0) {
        return -1;
    } else {
        throw new Error(`Sign cannot be computed on ${x}`);
    }
}

function toInt(x) {
    x = toNumber(x);

    if (isNaN(x)) {
        return 0;
    }

    if (x === 0 || x === Infinity || x === -Infinity) {
        return x;
    }

    return sign(x) * Math.floor(Math.abs(x));
}

function internalToString(x) {
    var o = {};
    o[x] = "banana";
    for (var prop in o) {
        if (o.hasOwnProperty(prop)) {
            return prop;
        }
    }
    throw new Error("internalToString");
}

function getGlobalObject() {
    var f = function () {
        return this;
    };
    return f();
}

/*
function isEmptyObject (obj) { 
  if (obj instanceof Number) return true; 
  for (var prop in obj) { 
    if (obj.hasOwnProperty(prop)) { 
      return false 
    }
  }
  return true; 
}
*/

export { ast2str, str2ast, copyFrom, int2str, bool2str, stringMap, chopExtension, boolXor, toInt, internalToString, isNaN, getGlobalObject };
