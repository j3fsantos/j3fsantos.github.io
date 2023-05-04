import { getLineTerminators, getWhiteSpace, getWordChars } from "./CharSetCP.mjs";
import { copyFrom, int2str } from "./utils.js";
import { canonicalise } from "./RegExpRuntime.mjs";

//      \d
function digitCharSet() {
    return charRangeCharSet("0", "9");
}

//      \D
function nonDigitCharSet() {
    var ret = digitCharSet();
    return {
        positive: {},
        negative: ret.positive,
    };
}

//      .
function dotCharSet() {
    var line_terminators = getLineTerminators();
    var lt = {};

    for (var i = 0; i < line_terminators.length; i++) {
        lt[line_terminators[i]] = true;
    }

    return {
        positive: {},
        negative: lt,
    };
}

//      \s
function whiteSpaceCharSet() {
    var line_terminators = getLineTerminators();
    var white_spaces = getWhiteSpace();
    var s_set = line_terminators.concat(white_spaces);

    var ret = {};
    for (var i = 0; i <= s_set.length; i++) {
        ret[s_set[i]] = true;
    }
    return {
        positive: ret,
        negative: null,
    };
}

//      \S
function nonWhiteSpaceCharSet() {
    var ret = whiteSpaceCharSet();
    return {
        positive: {},
        negative: ret.positive,
    };
}

//      \w
function wordCharSet() {
    var word_chars = getWordChars();
    var ret = {};
    for (var i = 0; i <= word_chars.length; i++) {
        ret[word_chars[i]] = true;
    }
    return {
        positive: ret,
        negative: null,
    };
}

//      \W
function nonWordCharSet() {
    var ret = wordCharSet();
    var r = {
        positive: {},
        negative: ret.positive,
    };
    return r;
}
function backSpaceCharSet() {
    return singletonCharSet(8);
}

//      \c<ctr>
function controlCharSet(ch, ctx) {
    var i = ch.codePointAt(0);
    var j = i % 32;

    return singletonCharSet(j);
}

/***************************************************** */

function singletonCharSet(c) {
    var ch_code = int2str(c);
    var ch_set = {};
    //ch_set[ch_code] = true;
    ch_set[ch_code] = {
        from: String.fromCharCode(c),
        to: "from",
    };
    return {
        positive: ch_set,
        negative: null,
    };
}

function emptyCharSet() {
    return {
        positive: {},
        negative: null,
    };
}

function charRangeCharSet(from, to) {
    // TODO: check if I really can canonicalise here

    var f = from.codePointAt(0);
    var t = to.codePointAt(0);
    var ret = {};
    for (var i = f; i <= t; i++) {
        var ip = i + "";
        ret[ip] = { from: from, to: to };
    }
    return {
        positive: ret,
        negative: null,
    };
}

function unionCharSets(acc, elem) {
    copyFrom(acc.positive, elem.positive);
    if (!acc.negative && elem.negative) {
        acc.negative = elem.negative;
    } else if (acc.negative) {
        copyFrom(acc.negative, elem.negative);
    }
    return acc;
}

function charSetToStr(chs) {
    return JSON.stringify(chs);
}

function contains(chs, ch) {
    var cc = int2str(ch.charCodeAt(0));
    if (chs.positive.hasOwnProperty(cc)) {
        return chs.positive[cc];
    } else if (chs.negative !== null && !chs.negative.hasOwnProperty(cc)) {
        return true;
    }
    return false;
    //return chs.positive.hasOwnProperty(cc) || (chs.negative !== null && !chs.negative.hasOwnProperty(cc));
}

export {
    singletonCharSet,
    emptyCharSet,
    charRangeCharSet,
    unionCharSets,
    charSetToStr,
    contains,
    dotCharSet,
    digitCharSet,
    whiteSpaceCharSet,
    nonWhiteSpaceCharSet,
    wordCharSet,
    nonWordCharSet,
    controlCharSet,
    nonDigitCharSet,
    backSpaceCharSet,
};
