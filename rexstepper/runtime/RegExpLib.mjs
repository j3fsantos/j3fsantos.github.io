import { multiline, global, ignoreCase, newCtx } from "./CompCtx.mjs";
import { captures, endIndex, nCaps, state, duplicateHead } from "./State.mjs";
import { isFailure, makeSuccess } from "./Failure.mjs";
import { int2str, toInt, internalToString } from "./utils.js";
import { string2matcher, emptyMatcher } from "./RegExpRuntime.mjs";

function defineOwnProperty(obj, prop, value, writable, enumerable, configurable) {
    Object.defineProperty(obj, prop, {
        value: value,
        writable: writable,
        enumerable: enumerable,
        configurable: configurable,
    });
}

function isRegExp(o) {
    return o !== null && typeof o === "object" && o instanceof RegExp;
}

function exec(lineInfo, str) {
    console.log("**************************");
    console.log(lineInfo);
    if (!isRegExp(this)) throw new TypeError("Method RegExp.prototype.exec called on incompatible receiver");

    var state_r;
    var s = internalToString(str);
    var r = this;
    var length = s.length;
    var i = toInt(r.lastIndex);
    var global = r.global;

    // CHECK THIS LINE IT FEELS SO SO WRONG
    i = i < 0 ? 0 : i;

    if (!global) {
        i = 0;
    }

    var matchSucceeded = false;
    RegExp.globalRet[lineInfo] = { trace: [], result: undefined };
    while (!matchSucceeded) {
        console.log(`Inside the main loop of exec. str: ${str}, s: ${s}, i: ${i}, length: ${length}, r.lastIndex: ${r.lastIndex}`);

        if (i < 0 || i > length) {
            r.lastIndex = 0;
            return null;
        }
        var ret = r.match(s, i);
        RegExp.globalRet[lineInfo].trace.push(ret);
        if (isFailure(ret)) {
            i = i + 1;
        } else {
            state_r = makeSuccess(ret);
            matchSucceeded = true;
        }
    }

    var e = endIndex(state_r);
    if (global) {
        r.lastIndex = e;
    }
    var n = nCaps(state_r);
    var a = new Array();
    var matchIndex = i;

    defineOwnProperty(a, "index", matchIndex, true, true, true);
    defineOwnProperty(a, "input", s, true, true, true);
    defineOwnProperty(a, "length", n, false, false, false);

    var matched_substr = s.substring(i, e);
    defineOwnProperty(a, "0", matched_substr, true, true, true);

    var caps = captures(state_r);
    for (var i = 1; i < n; i++) {
        var capture_i = caps[i];
        defineOwnProperty(a, int2str(i), capture_i, true, true, true);
    }
    console.log(`Match result: ${JSON.stringify(a)}\n\n`);
    RegExp.globalRet[lineInfo].result = a;
    return a;
}

function match(str, index) {
    var cont_c = function (state_c) {
        return makeSuccess(state_c);
    };
    var caps = new Array(this.nCaps).fill(undefined);
    var state_x = state("match", str, this.nCaps, index, caps);
    duplicateHead(state_x);
    return this._match(state_x, cont_c);
}

function test(str) {
    if (!isRegExp(this)) throw new TypeError("Method RegExp.prototype.exec called on incompatible receiver");

    var match = this.exec(str);
    return match !== null;
}

function toString() {
    if (this !== undefined) {
        throw new TypeError("RegExp.prototype.toString cannot be used as a constructor");
    }

    var source = this.source;
    var global = this.global;
    var ignoreCase = this.ignoreCase;
    var multiline = this.multiline;

    var g = global ? "g" : "";
    var i = ignoreCase ? "i" : "";
    var m = multiline ? "m" : "";

    return "/" + source + "/" + g + i + m;
}

// TODO: add flags and source to prototype correctly
var RegExpProto = {
    match: match,
    exec: exec,
    test: test,
    toString: toString,
};

function RegExp(m, nCaps, str, ctx) {
    var ctx;

    if (typeof m === "string") {
        m = string2matcher(m);
    }

    if (m !== undefined && nCaps !== undefined) {
        this._match = m;
        this.nCaps = nCaps;
        this._source = str;
    } else {
        this._match = emptyMatcher;
        this.nCaps = 1;
        this._source = "";
        ctx = newCtx({ flags: "" });
    }
    this._global = global(ctx);
    this._ignoreCase = ignoreCase(ctx);
    this._multiline = multiline(ctx);
    this.lastIndex = 0;
}

RegExp.globalRet = [];

Object.defineProperty(RegExp, "prototype", {
    value: RegExpProto,
    writable: false,
    enumerable: false,
    configurable: false,
});

RegExp.prototype.constructor = RegExp;

Object.defineProperty(RegExp.prototype, "ignoreCase", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this._ignoreCase;
    },
});

Object.defineProperty(RegExp.prototype, "multiline", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this._multiline;
    },
});

Object.defineProperty(RegExp.prototype, "global", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this._global;
    },
});

Object.defineProperty(RegExp.prototype, "source", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this._source;
    },
});

exec.prototype = undefined;
test.prototype = undefined;
toString.prototype = undefined;

Object.prototype.toString = (function () {
    var oldObjToString = Object.prototype.toString;
    return function (x) {
        var obj_to_print = this === undefined ? x : this;
        if (obj_to_print instanceof RegExp) {
            return "[object RegExp]";
        } else {
            var ret = oldObjToString.call(obj_to_print);
            return ret;
        }
    };
})();

export { RegExp };
