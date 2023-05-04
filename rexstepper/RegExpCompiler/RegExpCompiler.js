import regexp_tree from "regexp-tree";
import { processBreakPoints } from "./BreakPointInstrumentation.mjs"; 

//const { parse, traverse } = regexp_tree;
const { parser, traverse } = regexp_tree;
const parse = parser.setOptions({ captureLocations: true }).parse;


import { ast2str, str2ast, bool2str } from "../runtime/utils.js";
import {
    backSpaceCharSet,
    singletonCharSet,
    emptyCharSet,
    charRangeCharSet,
    unionCharSets,
    charSetToStr,
    dotCharSet,
    digitCharSet,
    whiteSpaceCharSet,
    nonWhiteSpaceCharSet,
    wordCharSet,
    nonWordCharSet,
    controlCharSet,
    nonDigitCharSet,
} from "../runtime/CharSet.mjs";
import { min, greedy, max, evaluateQuantifier } from "./Quantifier.mjs";
import { newCtx, ctx2str, incrParenIndex, incrParenCount, decrParenCount, getParenIndex, getParenCount, getNCaps } from "../runtime/CompCtx.mjs";
import { canonicalise } from "../runtime/RegExpRuntime.mjs";

import assert from "assert";

function freshSth(prefix) {
    var count = 0;
    return function () {
        return prefix + "_" + count++;
    };
}

var freshContVar = freshSth("cont");
var freshContDVar = freshSth("cont_d");
var freshStateVar = freshSth("state");
var freshStateYVar = freshSth("state_y");
var freshMatcherVar = freshSth("m");
var freshRVar = freshSth("r");
var freshTVar = freshSth("t");

/** Pattern Functions */

function genDisjunction(m1, m2) {
    var state_var = freshStateVar();
    var cont_var = freshContVar();
    var m1_var = freshMatcherVar();
    var m2_var = freshMatcherVar();
    var r = freshRVar();
    // const ret_str = `(function (${state_var}, ${cont_var}) { 
    //     var ${m1_var} = ${ast2str(m1)};
    //     var ${m2_var} = ${ast2str(m2)};
    //     saveBranch(${state_var}, getId(${state_var}));
    //     var ${r} = ${m1_var}(${state_var}, ${cont_var}); 
    //     if (!isFailure(${r})) { 
    //       return ${r}; 
    //     } else { 
    //         saveBacktrack(${state_var}, getId(${state_var}));
    //       return ${m2_var}(${state_var}, ${cont_var});
    //     }
    //  })`;
    const ret_str = `disjunctionMatcher(${ast2str(m1)}, ${ast2str(m2)})`;
    return str2ast(ret_str);
}

function genAlternative(m1, m2) {
    var state_var = freshStateVar();
    var cont_var = freshContVar();
    var m1_var = freshMatcherVar();
    var m2_var = freshMatcherVar();
    var statey_var = freshStateYVar();
    var contd_var = freshContDVar();

    // const ret_str = `(function (${state_var}, ${cont_var}) { 
    //     var ${m1_var} = ${ast2str(m1)};
    //     var ${m2_var} = ${ast2str(m2)};
    //     var ${contd_var} = function (${statey_var}) { 
    //       return ${m2_var}(${statey_var}, ${cont_var});
    //     }; 
    //     return ${m1_var}(${state_var}, ${contd_var}); 
    //  })`;

    const ret_str = `sequenceMatcher(${ast2str(m1)}, ${ast2str(m2)})`;

    //console.log("Going to print genAlternative");
    //console.log(ret_str);
    let strtoast = str2ast(ret_str);
    //console.log("After str2ast Alternative");
    return strtoast;
}

function genCharacterSetMatcher(ch_set, invert, ctx, loc) {
    var ch_set_str = charSetToStr(ch_set);
    //console.log("charSetToStr done");
    var invert_str = bool2str(invert);
    //console.log("bool2str done");
    //console.log(loc.source);
    //console.log(loc.source.replace('\"', '\\\"'));
    var ret_str = `characterSetMatcher(${ch_set_str}, ${invert_str}, ${ctx2str(ctx)}, {source: "${loc.source/*.replace("\"", "\\\"")*/}", start: "${
        loc.start.offset
    }", end: "${loc.end.offset}"})`;
    //console.log("characterSetMatcher done");
    //console.log(ret_str);
    let strtoast = str2ast(ret_str);
    //console.log("str2ast done");
    return strtoast;
}

function genContinue() {
    var state_var = freshStateVar();
    var cont_var = freshContVar();
    const ret_str = `(function (${state_var}, ${cont_var}) { 
       return ${cont_var}(${state_var});   
     })`;
    return str2ast(ret_str);
}

function genRepetition(m, rq, parenIndex, parenCount) {
    //if ((rq.max !== Infinity) && (rq.max < rq.min)) throw new Error("Syntax Error");
    var ret_str = `repeatMatcher(${ast2str(m)}, ${min(rq)}, ${max(rq)}, ${greedy(rq)}, ${parenIndex}, ${parenCount})`;
    return str2ast(ret_str);
}

// Added loc
function genGroupMatcher(m, parenIndex, loc) {
    parenIndex = parenIndex || 0;
    //console.log("------");
    //console.log(loc.source);
    //console.log(loc.source.replace('\"', '\\\"'));
    const ret_str = `getGroupMatcher(${ast2str(m)}, ${parenIndex}, {source: "${loc.source/*.replace(""", "\\"")*/}", start: "${
        loc.start.offset
    }", end: "${loc.end.offset}"})`;
    //console.log(ret_str);
    let strtoast = str2ast(ret_str);
    //console.log("genGroupMatcher success");
    return strtoast;
}

function genLocString(loc) {
    return `{source: "${loc.source.replace("\\", "\\\\")}", start: "${
        loc.start.offset
    }", end: "${loc.end.offset}"}`;
}

function genBackReferenceMatcher(i, ctx, loc) {
    assert(typeof i === "number");
    // console.log("------------------------------- backReferenceMatcher");
    // console.log(loc.source);
    const ret_str = `backReferenceMatcher(${i}, ${ctx2str(ctx)}, {source: "${loc.source.replace("\\", "\\\\")}", start: "${
        loc.start.offset
    }", end: "${loc.end.offset}"})`;
    return str2ast(ret_str);
}

function genAssertionMatcher(ctx, re) {
    assert(re.type === "Assertion");

    var tester_call;
    switch (re.kind) {
        case "^":
            tester_call = `getHatAssertionTester(${ctx2str(ctx)})`;
            break;

        case "$":
            tester_call = `getDollarAssertionTester(${ctx2str(ctx)})`;
            break;

        case "\\b":
            tester_call = `getBabyBAssertionTester()`;
            break;

        case "\\B":
            tester_call = `getBigBAssertionTester()`;
            break;

        default:
            throw new Error("genAssertionMatcher: unsupported assertion");
    }

    var state_var = freshStateVar();
    var cont_var = freshContVar();
    var r_var = freshRVar();
    var t_var = freshTVar();

    const ret_str = `
    (function(${state_var}, ${cont_var}) {
      var ${t_var} = ${tester_call}; 
      var ${r_var} = ${t_var}(${state_var}); 
      if (${r_var} === false) { 
          console.log(${state_var});
          console.log(${genLocString(re.loc)});
            let failure = makeFailure("genAssertionMatcher", ${genLocString(re.loc)}, ${state_var}); 
            console.log(failure);
            saveFailure(${state_var}, failure);
          return failure;
      } 
      return ${cont_var}(${state_var}); 
    })
  `;

    return str2ast(ret_str);
}

function genEmptyMatcher() {
    var ret_str = "emptyMatcher";
    return str2ast(ret_str);
}

function genLookaheadAssertion(m, negative, re) {
    var ret_str = `getLookaheadAssertion(${ast2str(m)}, ${negative}, ${genLocString(re.loc)})`;
    return str2ast(ret_str);
}

/***********************************************************/

function charAst2CharSet(char_ast, ctx) {
    switch (char_ast.kind) {
        // Pattern Character
        case "simple":
            var cc = canonicalise(char_ast.symbol, ctx);
            return singletonCharSet(cc.codePointAt(0));

        // Char escape
        case "unicode":
        case "hex":
            return singletonCharSet(char_ast.codePoint);

        case "decimal":
            if (char_ast.codePoint > getNCaps(ctx) || char_ast.codePoint === 0) {
                return singletonCharSet(char_ast.codePoint);
            } else {
                // TODO: this needs to essentially skip?
                // return { positive: {}, negative: {} };
                throw new Error("Forward references are not currently supported");
            }

        // Char escape
        case "control":
            var i = char_ast.value.indexOf("c");
            assert(i !== -1, "Parsing failed: control escape should have char 'c'");
            return controlCharSet(char_ast.value[i + 1]);

        case "meta":
            switch (char_ast.symbol) {
                // Dot pattern
                case ".":
                    if (char_ast.value == "\\b") {
                        return backSpaceCharSet();
                    }
                    return dotCharSet();

                // Atom escape - control escape
                case "\t":
                case "\n":
                case "\v":
                case "\f":
                case "\r":
                    return singletonCharSet(char_ast.codePoint);

                case undefined:
                    // Character class escape
                    switch (char_ast.value) {
                        case "\\d":
                            return digitCharSet();
                        case "\\D":
                            return nonDigitCharSet();
                        case "\\s":
                            return whiteSpaceCharSet();
                        case "\\S":
                            return nonWhiteSpaceCharSet();
                        case "\\w":
                            return wordCharSet();
                        case "\\W":
                            return nonWordCharSet();
                        default:
                            throw new Error(`Unsupported character class escape: ${char_ast.symbol}. value: ${char_ast.value}`);
                    }

                default:
                    throw new Error(`Unsupported meta symbol meta-switch: ${char_ast.symbol}. value: ${char_ast.value}`);
            }

        default:
            throw new Error(`Unsupported kind of character: ${char_ast.kind}. value: ${char_ast.value}`);
    }
}

function evaluateClassRanges(ranges, ctx) {
    if (ranges.length === 0) {
        return emptyCharSet();
    } else {
        var compiled_ranges = ranges.map(function (x) {
            switch (x.type) {
                case "Char":
                    return charAst2CharSet(x, ctx);

                case "ClassRange":
                    assert(x.from.type === "Char" && x.to.type === "Char");
                    var from = canonicalise(x.from.value, ctx);
                    var to = canonicalise(x.to.value, ctx);
                    return charRangeCharSet(from, to);

                default:
                    throw new Error("Class Range Unsupported");
            }
        });

        return compiled_ranges.reduce(function (acc, c_range) {
            return unionCharSets(acc, c_range);
        });
    }
}

/***********************************************************/

function compile(ctx, re) {
    // console.log("Function compile");
    // console.log(re);
    if (re === null) return genEmptyMatcher();
    var reString = JSON.stringify(re);
    try {
        switch (re.type) {
            case "Disjunction":
                var m1 = compile(ctx, re.left);
                var m2 = compile(ctx, re.right);
                return genDisjunction(m1, m2);

            case "Alternative":
                var len = re.expressions.length;
                if (len === 0) {
                    // Base case
                    return genContinue();
                } else {
                    // Inductive case
                    var re1 = re.expressions.shift();
                    var m1 = compile(ctx, re1);
                    var m2 = compile(ctx, re);
                    return genAlternative(m1, m2);
                }

            case "Char":
                var c_char_set = charAst2CharSet(re, ctx);
                // console.log("charAst2CharSet done");
                let matcher = genCharacterSetMatcher(c_char_set, false, ctx, re.loc);
                // console.log("genCharacterSetMatcher done");
                var r = genStateSaver(matcher);
                // console.log("genStateSaver done");
                return r;

            case "Repetition":
                var re1 = re.expression;
                var q = re.quantifier;
                var m = compile(ctx, re1);
                var rq = evaluateQuantifier(q);
                var parenIndex = getParenIndex(ctx);
                var parenCount = getParenCount(ctx);
                return genRepetition(m, rq, parenIndex, parenCount);

            case "CharacterClass": 
                var ret_ranges = evaluateClassRanges(re.expressions, ctx, re.loc);
                return genStateSaver(genCharacterSetMatcher(ret_ranges, re.negative === true, ctx, re.loc));
                
            case "UnconditionalBreakPoint":
                return genBreakPoint(re.source, re.startOffset, re.endOffset);

            case "ConditionalBreakPoint":
                return genConditionalBreakPoint(re.source, re.startOffset, re.endOffset, re.minIteration, re.maxIteration);

            case "Group":
                if (re.capturing) {
                    incrParenIndex(ctx);
                    incrParenCount(ctx);
                    var cur_paren_index = getParenIndex(ctx);
                    var re1 = re.expression;
                    var m1 = compile(ctx, re1);
                    decrParenCount(ctx);
                    //var parenIndex = getParenIndex(ctx);
                    return genGroupMatcher(m1, cur_paren_index, re.loc);
                } else {
                    var re1 = re.expression;
                    return compile(ctx, re1);
                }

            case "Backreference":
                //console.log(re.loc);
                return genStateSaver(genBackReferenceMatcher(re.reference, ctx, re.loc));

            case "Assertion":
                if (re.kind === "Lookahead") {
                    var m = compile(ctx, re.assertion);
                    return genLookaheadAssertion(m, re.negative === true, re);
                } else {
                    return genAssertionMatcher(ctx, re);
                }

            default:
                throw "not supported yet: " + re.type;
        }
    } catch (e) {
        if (!e.processed) {
            console.log("Error in " + reString);
            e.processed = true;
        }
        throw e;
    }
}

function isBreakPoint(re) {
    if (re.type === "CharacterClass" && re.expressions.length === 1 && re.expressions[0].type === "Char" && re.expressions[0].value === "!") {
        //console.log(re.expressions[0]);
        return {
            source: "[!]",
            startOffset: re.expressions[0].loc.start.offset - 1,
            endOffset: re.expressions[0].loc.end.offset + 1,
        };
    }
    return false;
}

function genBreakPoint(source, startOffset, endOffset) {
    //console.log("gen Breakpoint");
    var state_var = freshStateVar();
    var cont_var = freshContVar();
    const ret_str = `
    (function(${state_var}, ${cont_var}) {
        save(${state_var}, ${state_var}, true, "${source}", ${startOffset}, ${endOffset});
        return ${cont_var}(${state_var});
    })
  `;
    //console.log(ret_str);
    return str2ast(ret_str);
}

function genConditionalBreakPoint(source, startOffset, endOffset, minIteration, maxIteration) {
    //console.log("gen Breakpoint");
    var state_var = freshStateVar();
    var cont_var = freshContVar();
    const ret_str = `
    (function(${state_var}, ${cont_var}) {
        save(${state_var}, ${state_var}, true, "${source}", ${startOffset}, ${endOffset}, ${minIteration}, ${maxIteration});
        return ${cont_var}(${state_var});
    })
  `;
    //console.log(ret_str);
    return str2ast(ret_str);
}

/*
        function ${cont_var2}(${state_var2}) {
            if(isFailure(${state_var2})){
                saveFailure(${state_var});
            }
            return ${cont_var}(${state_var2});
        }

        return (${ast2str(matcher)})(${state_var}, ${cont_var2});


        (function(${state_var}, ${cont_var}) {
        save(${state_var}, false);
        var ret = (${ast2str(matcher)})(${state_var}, ${cont_var});
        if(isFailure(ret)){
            saveFailure(${state_var});
        }
        return ret;
    })
*/

function genStateSaver(matcher) {
    var state_var = freshStateVar();
    var cont_var = freshContVar();
    // const ret_str = `
    // (function(${state_var}, ${cont_var}) {
    //     var ret = (${ast2str(matcher)})(${state_var}, function(x) { return x });
    //     if(isFailure(ret)){
    //         saveFailure(${state_var}, ret);
    //         return ret;
    //     }
    //     save(ret, ${state_var}, false);
    //     return ${cont_var}(ret);
    // })`
    const ret_str = `saveState(${ast2str(matcher)})`;
    return str2ast(ret_str);
}

function countGroups(re) {
    var count = 0;
    traverse(re, {
        Group({ node }) {
            if (node.capturing) {
                count += 1;
            }
        },
    });
    return count;
}

function topCompile(re_str) {
    //console.log("----------------------");
    //console.log(re_str); 
    //re_str = re_str.replace(/"/g, "\\\""); 
    re_str = re_str.replace(/([^\\])"/g, "$1\\\"");
    //console.log("::::::::::::::::::::::::");
    //console.log(re_str);
    var escp_re_str = `${re_str}`;
    var re = parse(escp_re_str);
    console.log(JSON.stringify(re, null, 2));
    var nCaps = countGroups(re);

    var ctx = newCtx(re, nCaps);
    
    var re_body = processBreakPoints(re);

    var cre = compile(ctx, re_body);
    //console.log("Survived Compile regexpr");
    return {
        matcher: cre,
        flags: ctx, // shouldnt this be ctx.flags???
        nCaps: getParenIndex(ctx) + 1,
    };
}

export { topCompile };
