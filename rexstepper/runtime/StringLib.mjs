import { internalToString, getGlobalObject } from "./utils.js";
import { RegExp } from "./RegExpLib.mjs";
import { dynamicRegExpCreation, getNative } from "./DynRegExpLib.mjs";
import { isFailure, makeFailure } from "./Failure.mjs";
import { endIndex, captures, state } from "./State.mjs";

function checkObjectCoercible(obj) {
    if (typeof obj === "undefined" || obj === null) {
        throw new TypeError("Object is not coercible");
    }
}

function match(re) {
    if (this === undefined) {
        throw new TypeError("String.prototype.match cannot be used as a constructor");
    }

    if (getNative()) throw new Error(`NATIVE is true and our implementation was called`);
    //N.turnOnNative();
    checkObjectCoercible(this);
    var s = internalToString(this);

    var rx;
    if (re instanceof RegExp) {
        rx = re;
    } else {
        console.log(`INSIDE OUR MATCH! BEFORE dynamicRegExpCreation: ${getNative()}, str: ${s}, re: ${re}`);
        rx = dynamicRegExpCreation(re);
        console.log(`INSIDE OUR MATCH! AFTER dynamicRegExpCreation`);
    }

    var global = rx.global;

    if (!global) {
        return rx.exec(s);
    }

    rx.lastIndex = 0;
    var a = new Array();
    var prevLastIndex = 0;
    var n = 0;
    var lastMatch = true;

    while (lastMatch) {
        var result = rx.exec(s);
        if (result === null) {
            lastMatch = false;
        } else {
            var thisIndex = rx.lastIndex;

            if (thisIndex === prevLastIndex) {
                rx.lastIndex = thisIndex + 1;
                prevLastIndex = thisIndex + 1;
            } else {
                prevLastIndex = thisIndex;
            }

            var matchStr = result[0];
            Object.defineProperty(a, internalToString(n), {
                value: matchStr,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            n += 1;
        }
    }

    if (n === 0) {
        return null;
    }
    return a;
}

function replace(search_value, replace_value) {
    checkObjectCoercible(this);
    var str = internalToString(this);
    var ret_str = "";
    var rep_str;

    /*if (isEmptyObject(this)) { 
    throw new Error("Cannot use replace as a constructor")
  }*/

    if (search_value instanceof RegExp) {
        var rx = search_value;
        rx.lastIndex = 0;
        var prev_last_index = 0;
        var last_match = true;
        var this_index;

        do {
            var result = rx.exec(str);
            if (result === null) {
                last_match = false;
            } else {
                console.log(`successful exec. match: ${result[0]}. index: ${result.index}.`);
                if (typeof replace_value == "function") {
                    var args = [];
                    for (var i = 0; i < result.length; i++) {
                        args.push(result[i]);
                    }
                    args.push(result.index);
                    args.push(str);
                    rep_str = replace_value.apply(getGlobalObject(), args);
                    //rep_str = replace_value(... args);
                } else {
                    var new_str = internalToString(replace_value);
                    rep_str = resolveDollars(new_str, result[0], result.index, result.slice(1), str);
                    console.log(`exec_successful inside replace string. match: ${result[0]}. rep_str: ${rep_str}.`);
                }
                console.log(`old_ret_str: ${ret_str}. unmatched bit: ${str.substring(prev_last_index, result.index)}. new_str: ${ret_str + str.substring(prev_last_index, result.index) + rep_str}`);
                ret_str += str.substring(prev_last_index, result.index) + rep_str;
                this_index = rx.global ? rx.lastIndex : result.index + result[0].length;

                if (this_index === prev_last_index) {
                    rx.lastIndex = this_index + 1;
                    prev_last_index = this_index + 1;
                    ret_str += str[this_index] ? str[this_index] : "";
                } else {
                    prev_last_index = this_index;
                }
            }
        } while (rx.global && last_match);

        ret_str += str.substring(prev_last_index);
        return ret_str;
    } else {
        var search_string = internalToString(search_value);
        var res = internalSearch(str, search_string);

        //console.log(`typeof str: ${typeof str}. str: ${str}. typeof search_value: ${typeof search_string}. search_value: ${search_string}. replace_value: ${internalToString(replace_value)}. res: ${res}`);

        //var res = new RegExp(search_string).exec(string);
        if (res === -1) {
            return str;
        } else {
            if (typeof replace_value == "function") {
                rep_str = replace_value(search_string, res, str);
            } else {
                var new_str = internalToString(replace_value);
                rep_str = resolveDollars(new_str, search_string, res, [], str);
            }
            ret_str = str.substring(0, res) + rep_str + str.substring(res + search_string.length);
            return ret_str;
        }
    }
}

function consumeOneOrTwoDigits(i, str) {
    var x = str[i];
    var y = str[i + 1];
    var xi = parseInt(x);
    var yi = parseInt(y);
    if (isNaN(xi)) {
        return null;
    }
    if (isNaN(yi)) {
        return xi;
    }
    return xi * 10 + yi;
}

function internalSearch(str, search_str) {
    var ss_len = search_str.length;
    var up_bound = str.length - ss_len;
    for (var i = 0; i <= up_bound; i++) {
        var str_i = str.substring(i, i + ss_len);
        if (str_i === search_str) {
            return i;
        }
    }
    return -1;
}

function resolveDollar(i, rpl_str, match, index, caps, og_str) {
    var ret = function (next_index, value) {
        return { next_index, value };
    };

    if (rpl_str[i] !== "$") return null;

    switch (rpl_str[i + 1]) {
        case "$":
            return ret(i + 2, "$");

        case "&":
            return ret(i + 2, match);

        case "'":
            return ret(i + 2, og_str.substring(index + match.length));

        case "`":
            return ret(i + 2, og_str.substring(0, index));

        default:
            var d = consumeOneOrTwoDigits(i + 1, rpl_str);
            //console.log(`in the default case inside resolveDollar. d: ${d}. caps: ${}`);
            if (d === null) {
                return null;
            } else {
                var d = d <= caps.length ? d : Math.floor(d / 10);
                if (d > caps.length || d === 0) {
                    return null;
                } else {
                    var j = d > 9 ? 3 : 2;
                    var cd = caps[d - 1] ? caps[d - 1] : "";
                    return ret(i + j, cd);
                }
            }
    }
}

function resolveDollars(rpl_str, match, index, caps, og_str) {
    var ret_str = "";
    var i = 0;
    while (i < rpl_str.length) {
        var iter = resolveDollar(i, rpl_str, match, index, caps, og_str);
        console.log(`inside resolveDollars. i: ${i}. ret_str: ${ret_str}`);
        if (iter === null) {
            ret_str += rpl_str[i];
            i++;
        } else {
            console.log(`inside resolveDollars. found sth to replace. iter: ${JSON.stringify(iter)}`);
            ret_str += iter.value;
            i = iter.next_index;
        }
    }
    return ret_str;
}

function search(re) {
    if (getNative()) throw new Error(`NATIVE is true and our implementation was called`);
    //N.turnOnNative();
    checkObjectCoercible(this);
    var string = internalToString(this);

    var rx = re instanceof RegExp ? re : dynamicRegExpCreation(re);

    var match = rx.exec(string);
    //N.turnOffNative();
    return match == null ? -1 : match.index;
}

function split(separator, limit) {
    checkObjectCoercible(this);
    var s = internalToString(this);
    var a = new Array();
    var a_len = 0;
    var lim = limit == undefined ? Math.pow(2, 32) - 1 : limit;
    if ((lim = 0)) {
        return a;
    }
    var s_len = s.length;
    var p = 0;
    var r;
    if (separator instanceof RegExp) {
        r = separator;
    } else {
        r = internalToString(r);
    }

    if (separator == undefined) {
        Object.defineProperty(a, "0", {
            value: s,
            writable: true,
            enumerable: true,
            configurable: true,
        });
        return a;
    }

    if (s_len == 0) {
        var z = splitMatch(s, 0, r);
        if (isFailure(z)) {
            return a;
        } else {
            Object.defineProperty(a, "0", {
                value: s,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            return a;
        }
    }

    var q = p;

    while (q !== s_len) {
        var z = splitMatch(s, 0, r);
        if (isFailure(z)) {
            q += 1;
            break;
        }
        var e = endIndex(z);
        var caps = captures(z);

        if (e === p) {
            q += 1;
            break;
        }

        var t = s.substring(p, q);
        Object.defineProperty(a, internalToString(a_len), {
            value: t,
            writable: true,
            enumerable: true,
            configurable: true,
        });
        a_len += 1;
        if (a_len === lim) {
            return a;
        }

        p = e;
        for (var i = 1; i < caps.length; i++) {
            Object.defineProperty(a, internalToString(a_len), {
                value: caps[i],
                writable: true,
                enumerable: true,
                configurable: true,
            });
            a_len += 1;
            if (a_len === lim) {
                return a;
            }
        }
        q = p;
    }

    var t = s.substring(p, q);
    Object.defineProperty(a, internalToString(a_len), {
        value: t,
        writable: true,
        enumerable: true,
        configurable: true,
    });
    return a;
}

function splitMatch(s, q, r) {
    if (r instanceof RegExp) {
        return r.match(s); // this should be on the regexp prototype??
    }

    if (q + r.length > s.length) {
        return makeFailure();
    }

    if (s.substring(q, q + r.length) !== r) {
        return makeFailure();
    }
    return state(s, 0, q + r.length, new Array());
}

/******************************** Assignments ****************************************/

var oldStringMatch = String.prototype.match;
String.prototype.match = function (x) {
    if (getNative()) {
        return oldStringMatch.call(this, x);
    } else {
        return match.call(this, x);
    }
};
String.prototype.match.prototype = undefined;

var oldStringReplace = String.prototype.replace;
String.prototype.replace = function (x, y) {
    if (getNative()) {
        return oldStringReplace.call(this, x, y);
    } else {
        return replace.call(this, x, y);
    }
};
String.prototype.replace.prototype = undefined;

var oldStringSearch = String.prototype.search;
String.prototype.search = function (x) {
    if (getNative()) {
        return oldStringSearch.call(this, x);
    } else {
        return search.call(this, x);
    }
};
String.prototype.search.prototype = undefined;

var oldStringSplit = String.prototype.split;
String.prototype.split = function (x, y) {
    if (getNative()) {
        return oldStringSplit.call(this, x, y);
    } else {
        return split.call(this, x, y);
    }
};
String.prototype.split.prototype = undefined;

export { resolveDollars };
