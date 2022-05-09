import { getWordChars, getLineTerminators } from "./CharSetCP.mjs";

function isWordChar(str, i) {
    if (i === -1 || i === str.length) return false;
    var c = str[i].codePointAt(0);
    return getWordChars().includes(c);
}

function isLineTerminator(ch) {
    var chc = ch.codePointAt(0);
    return getLineTerminators().includes(chc);
}

export { isWordChar, isLineTerminator };
