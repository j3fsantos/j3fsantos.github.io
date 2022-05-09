import { str2ast, ast2str } from "../runtime/utils.js";
import { topCompile as reCompile } from "../RegExpCompiler/RegExpCompiler.js";
import { ctx2str } from "../runtime/CompCtx.mjs";
import { DYNAMIC } from "./config.mjs";

function mapJS(f, p) {
    if (!p) return p;

    var ret = f(p);
    if (ret !== null) {
        return ret;
    }

    switch (p.type) {
        case "Program":
            var body = p.body.map((s) => mapJS(f, s));
            return {
                type: p.type,
                body: body,
                sourceType: p.sourceType,
            };

        case "ExpressionStatement":
            var new_expression = mapJS(f, p.expression);
            return {
                type: p.type,
                expression: new_expression,
            };

        case "Literal":
            return {
                type: p.type,
                value: p.value,
                raw: p.raw,
            };

        case "Identifier":
            return {
                type: p.type,
                name: p.name,
            };

        case "AssignmentExpression":
        case "BinaryExpression":
        case "LogicalExpression":
            var left = mapJS(f, p.left);
            var right = mapJS(f, p.right);
            return {
                left: left,
                right: right,
                operator: p.operator,
                type: p.type,
            };

        case "MemberExpression":
            var object = mapJS(f, p.object);
            var property = mapJS(f, p.property);
            return {
                object: object,
                property: property,
                computed: p.computed,
                type: p.type,
            };

        case "CallExpression":
        case "NewExpression":
            var callee = mapJS(f, p.callee);
            var args = p.arguments.map((s) => mapJS(f, s));
            return {
                callee: callee,
                arguments: args,
                type: p.type,
            };

        case "ObjectExpression":
            var properties = p.properties.map((s) => mapJS(f, s));
            return {
                type: p.type,
                properties: properties,
            };

        case "DebuggerStatement":
        case "ThisExpression":
            return { type: p.type };

        case "UnaryExpression":
            var argument = mapJS(f, p.argument);
            return {
                type: p.type,
                argument: argument,
                prefix: p.prefix,
                operator: p.operator,
            };

        case "BlockStatement":
            var body = p.body.map((s) => mapJS(f, s));
            return {
                type: p.type,
                body: body,
            };

        case "DoWhileStatement":
        case "WhileStatement":
            var test = mapJS(f, p.test);
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                test: test,
                body: body,
            };

        case "ConditionalExpression":
        case "IfStatement":
            var test = mapJS(f, p.test);
            var consequent = mapJS(f, p.consequent);
            var alternate = mapJS(f, p.alternate);
            return {
                type: p.type,
                test: test,
                consequent: consequent,
                alternate: alternate,
            };

        case "ThrowStatement":
        case "ReturnStatement":
            var argument = mapJS(f, p.argument);
            return {
                type: p.type,
                argument: argument,
            };

        case "FunctionDeclaration":
        case "FunctionExpression":
            var params = p.params.map((s) => mapJS(f, s));
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                id: p.id,
                params: params,
                body: body,
                generator: p.generator,
                expression: p.expression,
                async: p.async,
            };

        case "VariableDeclaration":
            var declarations = p.declarations.map((s) => mapJS(f, s));
            return {
                type: p.type,
                declarations: declarations,
                kind: p.kind,
            };

        case "ArrayExpression":
            var elements = p.elements.map((s) => mapJS(f, s));
            return {
                type: p.type,
                elements: elements,
            };

        case "ContinueStatement":
        case "BreakStatement":
            return {
                type: p.type,
                label: p.label,
            };

        case "CatchClause":
            var param = mapJS(f, p.param);
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                param: param,
                body: body,
            };

        case "ForStatement":
            var init = mapJS(f, p.init);
            var test = mapJS(f, p.test);
            var update = mapJS(f, p.update);
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                init: init,
                test: test,
                update: update,
                body: body,
            };

        case "ForInStatement":
            var left = mapJS(f, p.left);
            var right = mapJS(f, p.right);
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                left: left,
                right: right,
                body: body,
                each: p.each,
            };

        case "LabeledStatement":
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                label: p.label,
                body: body,
            };

        case "Property":
            var key = mapJS(f, p.key);
            var value = mapJS(f, p.value);
            return {
                type: p.type,
                key: key,
                computed: p.computed,
                value: value,
                kind: p.kind,
                method: p.method,
                shorthand: p.shorthand,
            };

        case "SequenceExpression":
            var expressions = p.expressions.map((s) => mapJS(f, s));
            return {
                type: p.type,
                expressions: expressions,
            };

        case "SwitchStatement":
            var discriminant = mapJS(f, p.discriminant);
            var cases = p.cases.map((s) => mapJS(f, s));
            return {
                type: p.type,
                discriminant: discriminant,
                cases: cases,
            };

        case "SwitchCase":
            var test = mapJS(f, p.test);
            var consequent = mapJS(f, p.consequent);
            return {
                type: p.type,
                test: test,
                consequent: consequent,
            };

        case "TryStatement":
            var block = mapJS(f, p.block);
            var handler = mapJS(f, p.handler);
            var finalizer = mapJS(f, p.finalizer);
            return {
                type: p.type,
                block: block,
                handler: handler,
                finalizer: finalizer,
            };

        case "VariableDeclarator":
            var id = mapJS(f, p.id);
            var init = mapJS(f, p.init);
            return {
                type: p.type,
                id: id,
                init: init,
            };

        case "WithStatement":
            var object = mapJS(f, p.object);
            var body = mapJS(f, p.body);
            return {
                type: p.type,
                object: object,
                body: body,
            };

        default:
            return p;
    }
}

function genRegExpConstr(pat, raw) {
    var ret_str;
    try {
        var ret = reCompile(raw);
        console.log("compiled with success");
        var m = ret.matcher;
        var flags = ret.flags;
        var nCaps = ret.nCaps;
        var escp_pat = JSON.stringify(pat);
        ret_str = `
      new RegExp (${ast2str(m)}, ${nCaps}, ${escp_pat}, ${ctx2str(flags)})
    `;
    } catch (e) {
        if (e instanceof SyntaxError) {
            ret_str = `
      (function () { throw new SyntaxError(${JSON.stringify(e.message) || "Could not compile the regular expression"}) })()
      `;
        } else {
            console.log(e);
            throw e;
        }
    }
    return str2ast(ret_str);
}

function genDynRegExprConstr1(pat, flags, call_expr) {
    var flags_str = flags === undefined ? "undefined" : ast2str(flags);
    var ret_str = `dynamicRegExpCreation(${ast2str(pat)}, ${flags_str})`;
    return str2ast(ret_str);
}

function genDynRegExprConstr2(callee, args) {
    var args_strs = args.map((arg) => ast2str(arg));
    var args_str = args_strs.join();
    var ret_str = ` (function(){
    if (${ast2str(callee)} === RegExp) {
      // we need to call dynamicRegExpCreation
      return dynamicRegExpCreation(${args_str})
    } else {
      return new ${ast2str(callee)} (${args_str})
    }
  })();`;
    return str2ast(ret_str);
}

function esprimaEmptyStringLit() {
    return {
        type: "Literal",
        value: "",
        raw: '""',
    };
}

function replaceRegExp(s) {
    if (!s) return s;
    var call_expr = false;

    switch (s.type) {
        case "Literal":
            if (s.regex) {
                var pat = s.regex.pattern;
                var raw = s.raw;
                return genRegExpConstr(pat, raw);
            } else return null;

        case "CallExpression":
            if (s.callee.type == "MemberExpression" && s.callee.property.type == "Identifier" && s.callee.property.name == "exec") {
                s.arguments.unshift({
                    type: "Literal",
                    value: s.loc.start.line,
                    raw: s.loc.start.line + "",
                });
                return null;
            }
            call_expr = true;
        case "NewExpression":
            var callee = s.callee;
            var args = s.arguments.map((arg) => compileJS(arg));

            if (callee.type !== "Identifier" || callee.name !== "RegExp") {
                if (DYNAMIC && !call_expr) {
                    return genDynRegExprConstr2(callee, args);
                } else {
                    return null;
                }
            }

            var pat = args[0] || esprimaEmptyStringLit();
            var flags = args[1] || esprimaEmptyStringLit();

            if (pat.type !== "Literal" || flags.type !== "Literal") {
                if (DYNAMIC) {
                    return genDynRegExprConstr1(args[0], args[1], call_expr);
                } else {
                    throw new Error("Dynamic RegExp Creation is NOT supported");
                }
            }
            var p = pat.value;
            var f = "";
            if (pat.regex) {
                p = pat.regex.pattern;
                f = pat.regex.flags;
            }

            if (flags.value !== "") {
                f = flags.value;
            }

            console.log(`Pattern: ${p}`);
            console.log(`Flags: ${f}`);
            console.log(`Raw: /${p}/${f}`);
            return genRegExpConstr(p, `/${p}/${f}`);

        default:
            return null;
    }
}

function compileJS(p) {
    return mapJS(replaceRegExp, p);
}

export { compileJS };
