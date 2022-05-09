let iterationIndex;
let execIndex;
let regex = "";
let iterations = [];
let execs = [];
let currentDecorations = [];
const NODE_TEXT_MAX_SIZE = 21;

/* Global Object with all needed variables to navigate through the states
 in the given match and present them to the user */
let stateObject = {
    states: [],
    previousStateIndex: 0,
    currentStateIndex: 0,
    str: "",
    strLength: 0,
    regex: "",
};

/**
 *  Run Esprima on the input box program
 *  Compile the Regular expression
 *  Build a global object (stateObject) with essential info for handling state navigation
 *  Update currentIndex, with the 1st BreakPoint or the last state
 *  Output the match on the Output window
 *  Visually update current state on Debug and Tree windows
 *  Enable Debugging buttons (step forward, back, etc) if the match is successfull
 **/
function compile() {
    cleanScrollMemoryOnCompile();
    window.run_exp.resetIdCounter();
    window.run_exp.RegExp.globalRet = [];
    const message_elm = document.getElementById("message");
    const debug_elm = document.getElementById("debugWindow");
    const compilation_elm = document.getElementById("compilation");
    const runtime_elm = document.getElementById("runtime");
    const tree_elm = document.getElementById("treeWindow");
    const input_expression = editor.getValue(); // Get current value of what's inside the Editor
    console.log(input_expression);
    const matchFailed = "Match Failed";

    removeAllCurrentExecStyles();
    const esprima_program = call_esprima(input_expression);

    /* IF esprima_program returns an error, print error message and clean compiledJS window */
    if (esprima_program instanceof Error) {
        updateMessageBox(true, message_elm, esprima_program); // "Error" red message, with error info
        cleanDiv(compilation_elm);
        cleanDiv(runtime_elm);
        cleanDiv(debug_elm);
        cleanDiv(tree_elm);
        disableAllDebugButtons();
        return;
    }

    /* ELSE put esprima program inside compiledJS window and continue execution */
    const compiledJS_toStr = window.compile_exp.ast2str(window.compile_exp.compileJS(esprima_program));
    let evalMatch = null;
    try {
        // console.log("compiled code:");
        // console.log("with (window.run_exp) {" + compiledJS_toStr + "}");
        evalMatch = eval("with (window.run_exp) {" + compiledJS_toStr + "}");

        
        console.log("result of evalMatch"); 
        console.log(evalMatch);
    } catch (err) {
        console.log("Eval failed: Disabling App");
        console.log(err);
        runtime_elm.innerHTML = `<div id="runtime-div"><span class="runtime-title">Match: </span><span id="runtime-match">${matchFailed}</span></div>
        <div id="runtime-div"><span class="runtime-title">Groups: </span><div id="runtime-groups"></div></div>`;
        debug_elm.innerHTML = matchFailed;
        tree_elm.innerHTML = matchFailed;
        disableAllDebugButtons();
        return;
    }
    updateMessageBox(false, message_elm); // "Compiled Successfully" green message
    compilation_elm.innerHTML = compiledJS_toStr; // Update CompiledJS div

    // Build 'execs' (list of executions/regex's) and get current 'exec' (execution/regex)
    let regular_expressions = getRegularExpressionsEsprima(esprima_program);


    console.log("result of getRegularExpressionsEsprima"); 
    console.log(regular_expressions);

    buildExecsObject(window.run_exp.RegExp.globalRet, regular_expressions);
    execIndex = execs.length - 1;
    console.log(execIndex);

    console.log("execs object");
    console.log(execs);
    
    updateResult(); //write result of currenct exec (match and capture groups) on Output window
    styleExec(execs[execIndex].lineNumber);

    // Build 'iterations' list for the current 'exec' and get current 'iteration'
    iterations = execs[execIndex].iterations;
    let iterationsLength = iterations.length;
    iterationIndex = iterationsLength - 1;
    let currentIteration = iterations[iterationIndex];
    updateIterationCount();
    // Build current 'state'
    let firstStateIndex = getFirstState(currentIteration);
    decrementGroupMatcherIndex(iterations);
    buildStateObject(currentIteration, firstStateIndex); // Initialize global states object

    console.log("stateObjects"); 
    console.log(stateObject);

    // Update visuals
    updateState(firstStateIndex); // Update and visually style that state on the debug div
    enableAllDebugButtons(); // Enable debugging buttons only after a Regex compilation has been executed

    // Create Tree View for the current iteration
    let newTree = cleanTree(stateObject.states);
    defineTreeVars();
    initializeTree(traceToD3Tree(newTree));
    //tree_elm.innerHTML = JSON.stringify(traceToD3Tree(stateObject.states), null, 5);

    /*
    } else {
        console.log("DISABLE");
        runtime_elm.innerHTML = matchFailed;
        debug_elm.innerHTML = matchFailed;
        tree_elm.innerHTML = matchFailed;
        disableAllDebugButtons();
    }*/
    //listToTree(stateObject.states);
}

/* Get every regular expression that is present in the esprima program, we must have an "expression.exec(input-string) for each one, 
or this wont work (we will have more regular expressions than executions) */
function getRegularExpressionsEsprima(esprima_program) {
    let regular_expressions = [];
    let execs_for_expression = [];
    let body = esprima_program.body;
    //console.log(body); 
    /*
    for (let d = 0; d < body.length; d++) {
        if (body[d].declarations) {
            regular_expressions.push(body[d].declarations[0].init.regex.pattern);
            execs_for_expression.push(0);
        } else if (body[d].expression) execs_for_expression[execs_for_expression.length - 1]++;
    }
    console.log(regular_expressions);
    console.log(execs_for_expression);
    return regular_expressions;*/
    for (let d = 0; d < body.length; d++) {
        if (body[d].declarations) {
            regular_expressions.push({ pattern: body[d].declarations[0].init.regex.pattern, n_execs: 0 });
        } else if (body[d].expression) {
            if (regular_expressions[regular_expressions.length - 1].n_execs == 0) {
                regular_expressions[regular_expressions.length - 1].n_execs++;
            } else if (regular_expressions[regular_expressions.length - 1].n_execs > 0) {
                regular_expressions[regular_expressions.length - 1].n_execs++;
                regular_expressions.push({
                    pattern: regular_expressions[regular_expressions.length - 1].pattern,
                    n_execs: regular_expressions[regular_expressions.length - 1].n_execs,
                });
            }
        }
    }
    //console.log(regular_expressions);
    return regular_expressions;
    // maybe we should not save regular expressions, but save the execs? TODO
    // check if VariableDeclaration.declarations.id.name == ExpressionStatement.expression.callee.object.name
    // if it is, we can relate the regular expression with the exec.
    // If there is more than 1 exec, we use this comparison to connect them to the same regular expression.
    // This BuildExecObjects() has an object for each Exec on the Monaco editor and not for each expression (maybe now we highlight the exec and not the regular expression. Or ideally both)
}

// Updates the Result of the execution, i.e., the match result, and the capture groups are written on the Output window
function updateResult() {
    let currentExec = execs[execIndex];
    const runtimeMatch = document.getElementById("runtime-match");
    const runtimeGroups = document.getElementById("runtime-groups");
    let capture_groups = [];
    if (!currentExec.result) {
        runtimeMatch.innerHTML = "Failed";
        runtimeGroups.innerHTML = "";
        return;
    }
    runtimeGroups.innerHTML = "";
    let count = 1;
    for (const [index, element] of currentExec.result.entries()) {
        if (index !== 0) {
            if (element != undefined) {
                let group = `<div class="runtime-group">${count}: ${element}</div>`;
                capture_groups.push(group);
                count++;
            }
        } else {
            runtimeMatch.innerHTML = element;
        }
    }
    if (capture_groups.length === 0) runtimeGroups.innerHTML = "no groups";
    else {
        for (const element of capture_groups) {
            runtimeGroups.innerHTML += element;
        }
    }
}

function updateIterationCount() {
    //const iterationCount_elm = document.getElementById("iterationCount");
    const iterationCount_elm = document.querySelectorAll("#iterationCount p")[1];
    let currentIterationNumber = iterationIndex + 1;
    let iterationsLength = execs[execIndex].iterations.length;
    iterationCount_elm.innerHTML = `${currentIterationNumber}/${iterationsLength}`;
}

/* Build an object to store the current Execution / Regular Expression */
function buildExecsObject(obj, regular_expressions) {
    execs = [];
    let r = 0;
    //console.log(obj);
    for (let key in obj) {
        //console.log(key);
        let lineNumber = key;
        let result = obj[key].result;
        let iterations = obj[key].trace;
        let exec = {
            lineNumber: lineNumber,
            iterations: iterations,
            result: result,
            regex: regular_expressions[r].pattern,
            decorationId: "",
        };
        execs.push(exec);
        r++;
    }
    // console.log(execs);
}

/* Adds highlight to the current Execution / Regular Expression, by inserting a decoration in Monaco Editor Decorations List 
   Each Execution / Regular Expression stores its own decoration ID, so it can be removed when another highlight takes place */
function styleExec(lineNumber) {
    decorationId = editor.deltaDecorations(
        [],
        [{ range: new monaco.Range(lineNumber, 1, lineNumber, 0), options: { isWholeLine: true, inlineClassName: "current-exec" } }]
    );
    execs[execIndex].decorationId = decorationId;
    currentDecorations.push(decorationId);
}

/* We need to delete every other decoration related to other executions before adding a new one, so we dont have 2 at the same time. */
function removeOtherExecStyles() {
    for (let e = 0; e < execs.length; e++) {
        if (execs[e].decorationId != "") editor.deltaDecorations([[execs[e].decorationId]], []);
    }
    removeAllCurrentExecStyles();
}
// Delete from the editor's context and from the global var
function removeAllCurrentExecStyles() {
    editor.deltaDecorations([[currentDecorations]], []);
    currentDecorations = [];
}

function changeEditorValue(elm) {
    let regex = elm.innerHTML;
    let string = elm.dataset.value || "test";
    let editor_block = "";
    // Regex
    let value = `var regex = ${regex};`;
    // Execs
    let execs = `regex.exec('${string}');`;
    if(elm.dataset.multi_line === "true") {
        execs = `regex.exec(\`${string}\`);`;
    }
    if(elm.dataset.mult > 1) {
        let i = 1;
        execs = "";
        let values = $(elm).data('value');
        while(i <= elm.dataset.mult) {
            if(i === elm.dataset.mult) {
                execs = execs + `regex.exec('${values[i-1]}');`;
                if(elm.dataset.multi_line === "true") {
                    execs = execs + `regex.exec(\`${values[i-1]}\`);`;
                }
            }
            else {
                execs = execs + `regex.exec('${values[i-1]}');\n`;
                if(elm.dataset.multi_line === "true") {
                    execs = execs + `regex.exec(\`${values[i-1]}\`);\n`;
                }
            }
            i++;
        }
    }
    // Comment / Explanation
    if(elm.dataset.comment) {
        let comment = elm.dataset.comment;
        editor_block = `// ${comment}\n${value}\n${execs}`;
    }
    else {
        editor_block = `${value}\n${execs}`;
    }   
    // Push to Editor
    editor.setValue(editor_block);
}

/* Quick access buttons to change to the "first" or "last" state */
function changeState(firstOrLast) {
    saveScrollPosition();
    const first = document.getElementById("FirstState");
    const last = document.getElementById("LastState");
    const bpLeft = document.getElementById("BPLeft");
    const bpRight = document.getElementById("BPRight");
    const stepLeft = document.getElementById("StepLeft");
    const stepRight = document.getElementById("StepRight");
    if (firstOrLast == "first") {
        disableDebugButton(stepLeft);
        disableDebugButton(bpLeft);
        disableDebugButton(first);
        enableDebugButton(stepRight);
        enableDebugButton(bpRight);
        enableDebugButton(last);
        stateObject.currentStateIndex = 0;
        updateState(0);
    } else if (firstOrLast == "last") {
        disableDebugButton(stepRight);
        disableDebugButton(bpRight);
        disableDebugButton(last);
        enableDebugButton(stepLeft);
        enableDebugButton(bpLeft);
        enableDebugButton(first);
        stateObject.currentStateIndex = stateObject.states.length - 1;
        updateState(stateObject.states.length - 1);
    }
    getScrollPosition();
}

function changeIteration(index) {
    // console.log("Change Iteration");
    // console.log(index);

    let currentIteration = iterations[index];
    let firstStateIndex = getFirstState(currentIteration);

    buildStateObject(currentIteration, firstStateIndex); // Initialize global states object
    updateState(firstStateIndex); // Update and visually style that state on the debug div
    enableAllDebugButtons(); // Enable debugging buttons only after a Regex compilation has been executed

    let newTree = cleanTree(stateObject.states);
    defineTreeVars();
    initializeTree(traceToD3Tree(newTree));
}

function decrementGroupMatcherIndex(iterations) {
    for (let i = 0; i < iterations.length; i++) {
        let nodes = iterations[i].old_states;
        for (let j = 0; j < nodes.length; j++) {
            if (nodes[j].msg === "getGroupMatcher") nodes[j].end_index = nodes[j].end_index - 1;
        }
    }
}

/* Build global object with every variable we need for handling states */
function buildStateObject(obj, index) {
    stateObject.states = []; // TODO,, new  . I put this here to reset stateObjects old states array in case the user re-compiles the same expression
    if (obj == undefined) return;
    stateObject.states = [...obj.old_states];

    let end_index_new = null;
    let id_new = null;
    let n_caps_new = null;

    if (obj.end_index == 0 || obj.end_index) end_index_new = obj.end_index;
    if (obj.id == 0 || obj.id) id_new = obj.id;
    if (obj.n_caps == 0 || obj.n_caps) n_caps_new = obj.n_caps;

    let lastState = {
        str: obj.str,
        n_caps: n_caps_new,
        end_index: end_index_new,
        captures: obj.captures || [],
        isBreakPoint: obj.isBreakPoint || false,
        id: id_new,
        loc: obj.loc,
    };

    if (obj.failure) lastState.failure = obj.failure;

    stateObject.states.push(lastState);
    stateObject.currentStateIndex = index;
    //let str = placeBreakPoints([...stateObject.states], obj.str);
    //stateObject.str = str;
    //stateObject.strLength = str.length;
    if (obj.str) {
        stateObject.str = obj.str;
        stateObject.strLength = obj.str.length;
    }
    //stateObject.regex = regex;
    stateObject.regex = execs[execIndex].regex;
}

/* Styles the state on the given index */
function updateState(index) {
    // Stepping into state that does not exist -> maintain the debug window as it is
    if (stateObject.states[index] == undefined) return; //TODO maybe we dont need this
    // If theres no match there's no debug, clean the debug window
    if (stateObject == undefined || stateObject == null) {
        cleanDiv(debug_elm);
        return;
    }

    // Present info regarding the current state
    const debug_elm = document.getElementById("debugWindow");
    let currentState = stateObject.states[index];
    debug_elm.innerHTML = printState(currentState);

    let endIndexOfPreviousCleanState = currentState.end_index;
    let isFail = false;
    // When this is a failure or a breakpoint (not representable on the string, only on the regex), the String maintains the last stable highlight. Is this correct? TODO
    if (currentState.isBreakPoint) {
        //endIndexOfPreviousCleanState = getPreviousCleanState(currentState.end_index, stateObject.states);
        endIndexOfPreviousCleanState = currentState.end_index - 1;
    }
    if (currentState.isFailure || currentState.failure) {
        isFail = true;
    }

    styleRegex(currentState, index, isFail);
    styleString(currentState, stateObject.states[0].end_index, endIndexOfPreviousCleanState, isFail); //currentState.end_index); //+ numberOfBreakPoints(index));
}

/* Debug Buttons onClick function: updates the globalRet index (for example, 1 step right = index++) */
function updateDebugger(direction, isBreakPoint, elm) {
    saveScrollPosition();
    const bpLeft = document.getElementById("BPLeft");
    const bpRight = document.getElementById("BPRight");
    const stepLeft = document.getElementById("StepLeft");
    const stepRight = document.getElementById("StepRight");
    const first = document.getElementById("FirstState");
    const last = document.getElementById("LastState");
    if (isBreakPoint) {
        updateDebuggerBP(bpLeft, bpRight, stepLeft, stepRight, direction, first, last);
    } else {
        updateDebuggerStep(bpLeft, bpRight, stepLeft, stepRight, direction, first, last);
    }
    updateState(stateObject.currentStateIndex);
    getScrollPosition();
}

function updateDebuggerBP(bpLeft, bpRight, stepLeft, stepRight, direction) {
    let ret = getNextBreakPoint(stateObject.currentStateIndex, direction);
    stateObject.previousStateIndex = stateObject.currentStateIndex;
    if (!ret) {
        if (direction == "left") {
            disableDebugButton(bpLeft);
        } else if (direction == "right") {
            disableDebugButton(bpRight);
        }
    } else {
        if (direction == "left") {
            enableDebugButton(bpRight);
            enableDebugButton(stepRight);
        } else if (direction == "right") {
            enableDebugButton(bpLeft);
            enableDebugButton(stepLeft);
        }
        stateObject.currentStateIndex = ret;
    }
}

function updateDebuggerStep(bpLeft, bpRight, stepLeft, stepRight, direction, first, last) {
    stateObject.previousStateIndex = stateObject.currentStateIndex;
    if (direction == "left") {
        if (stateObject.currentStateIndex > 0) {
            stateObject.currentStateIndex -= 1;
            if (stateObject.currentStateIndex == 0) {
                disableDebugButton(stepLeft);
                disableDebugButton(bpLeft);
                disableDebugButton(first);
            }
            if (stateObject.states[stateObject.currentStateIndex].branch || stateObject.states[stateObject.currentStateIndex].backtrack || stateObject.states[stateObject.currentStateIndex].epsilon) {
                updateDebuggerStep(bpLeft, bpRight, stepLeft, stepRight, direction, first, last);
            }
            enableDebugButton(stepRight);
            enableDebugButton(bpRight);
            enableDebugButton(last);
        }
    } else if (direction == "right") {
        //if (stateObject.currentStateIndex < stateObject.strLength - 1) {
        if (stateObject.currentStateIndex < stateObject.states.length - 1) {
            stateObject.currentStateIndex += 1;
            //if (stateObject.currentStateIndex == stateObject.strLength - 1) {
            if (stateObject.currentStateIndex == stateObject.states.length - 1) {
                disableDebugButton(stepRight);
                disableDebugButton(bpRight);
                disableDebugButton(last);
            }
            if (stateObject.states[stateObject.currentStateIndex].branch || stateObject.states[stateObject.currentStateIndex].backtrack || stateObject.states[stateObject.currentStateIndex].epsilon) {
                updateDebuggerStep(bpLeft, bpRight, stepLeft, stepRight, direction, first, last);
            }
            enableDebugButton(stepLeft);
            enableDebugButton(bpLeft);
            enableDebugButton(first);
        } else {
            disableDebugButton(stepRight);
            disableDebugButton(last);
            disableDebugButton(bpRight);
        }
    }
}

function updateExec(direction, elm) {
    const execLeft = document.getElementById("ExecLeft");
    const execRight = document.getElementById("ExecRight");
    if (direction === "left") {
        if (execIndex <= 0) {
            disableDebugButton(execLeft);
            return;
        }
        execIndex -= 1;
        // console.log("exec Index Left = " + execIndex);
        if (execIndex <= 0) disableDebugButton(execLeft);
        enableDebugButton(execRight);
        changeExec(execIndex);
    }
    if (direction === "right") {
        if (execIndex >= execs.length - 1) {
            disableDebugButton(execRight);
            return;
        }
        execIndex += 1;
        // console.log("exec Index Right = " + execIndex);
        // console.log(execs.length - 1);
        if (execIndex >= execs.length - 1) disableDebugButton(execRight);
        enableDebugButton(execLeft);
        changeExec(execIndex);
    }
}

function changeExec(index) {
    // console.log("Change Exec");
    // console.log(index);

    let currentExec = execs[index];

    iterations = currentExec.iterations;
    let iterationsLength = iterations.length;
    iterationIndex = iterationsLength - 1;
    removeOtherExecStyles();
    styleExec(execs[index].lineNumber);
    changeIteration(iterationIndex);
    updateIterationCount();
    updateResult();
}

function updateIteration(direction, elm) {
    const iterationLeft = document.getElementById("IterationLeft");
    const iterationRight = document.getElementById("IterationRight");
    if (direction === "left") {
        if (iterationIndex <= 0) {
            disableDebugButton(iterationLeft);
            return;
        }
        iterationIndex -= 1;

        // console.log("Iteration Index Left = " + iterationIndex);

        if (iterationIndex <= 0) disableDebugButton(iterationLeft);
        enableDebugButton(iterationRight);

        changeIteration(iterationIndex);
    }
    if (direction === "right") {
        if (iterationIndex >= iterations.length - 1) {
            disableDebugButton(iterationRight);
            return;
        }
        iterationIndex += 1;
        // console.log("Iteration Index Right = " + iterationIndex);
        // console.log(iterations.length - 1);
        if (iterationIndex >= iterations.length - 1) disableDebugButton(iterationRight);
        enableDebugButton(iterationLeft);

        changeIteration(iterationIndex);
    }
    updateIterationCount();
}

/************************************************ Auxiliary Functions ************************************************/

/* Updates the compilation message box from green (valid) to red (error) */
function updateMessageBox(isError, message_elm, msg) {
    const success_message = "Compiled Successfully!";
    if (isError) {
        message_elm.classList.remove("clean");
        message_elm.classList.add("error");
        message_elm.innerHTML = msg;
    } else {
        message_elm.classList.remove("error");
        message_elm.classList.add("clean");
        if(document.querySelector("#tree-tab").classList.contains("active")) {
            document.querySelector("#toggleExpansion").style.display = "block";
        }
        message_elm.innerHTML = success_message;
    }
}

function call_esprima(program) {
    try {
        return esprima.parseScript(program, { loc: true });
    } catch (error) {
        return error;
    }
}

/* Obtains the index (of a globalRet state) of the 1st break point, 
or the last state (if there are no break points) */
function getFirstState(obj) {
    let states = [...obj.old_states];
    stateObject.strLength = states.length;
    for (let i = 0; i < states.length; i++) {
        if (states[i].isBreakPoint) {
            stateObject.currentStateIndex = i;
            return stateObject.currentStateIndex;
        }
    }
    stateObject.currentStateIndex = states.length;
    return stateObject.currentStateIndex;
}

/* Returns the number of existent Breakpoints from index 0 to the given index in the arguments. */
/*function numberOfBreakPoints(index) {
    let countBreakPoints = 0;
    let states = stateObject.states;
    for (let i = 0; i < states.length; i++) {
        if (i == index) {
            return countBreakPoints;
        }
        if (states[i].isBreakPoint) {
            countBreakPoints += 1;
        }
    }
}*/

// EVR QuANTOS BP existem com base no loc.end e percorrer o regex e ver se há uma bola, if elm = \u25CF, em vez de percorrer estados
// porque em backtracks podemos nao voltar a apanhar um breakpoint e esta função diz que sim
function numberOfBreakPoints(regex, end) {
    let locEnd = end - 1;
    let breakPointVisual = "[!]";
    let countBreakPoints = 0;

    let lookForBreakPoint = regex.substring(0, locEnd); // get the part of the regex that we want (right until the current loc.end)
    //console.log(locEnd);
    //console.log(lookForBreakPoint);
    countBreakPoints = lookForBreakPoint.split(breakPointVisual).length - 1;
    //console.log(countBreakPoints);
    return countBreakPoints;
}

function getNextBreakPoint(index, direction) {
    let states = stateObject.states;

    if (direction == "left") {
        for (let i = index; i > 0; i--) {
            if (i == index) continue;
            if (states[i].isBreakPoint) {
                return i;
            }
        }
    } else if (direction == "right") {
        for (let i = 0; i < states.length; i++) {
            if (i <= index) continue;
            //if (i == states.length - 1) return false;
            if (states[i].isBreakPoint) {
                return i;
            }
        }
    }
    return false;
}

function getPreviousCleanState(bpId, states) {
    let b = false;
    for (let i = states.length - 1; i > 0; i--) {
        //console.log(states[i].id);
        //console.log(i);
        if (states[i].id == bpId) b = true;
        if (!b) continue;
        //if (states[i].isFailure) continue;
        if (states[i].branch) continue;
        if (states[i].epsilon) continue;
        if (states[i].backtrack) continue;
        return states[i].end_index;
    }
    return false;
}

/* Formats the output string by visually adding the breakpoints 
function placeBreakPoints(states, str) {
    console.log("aaaaaaaaaaaaaaa " + str);
    let ids = [];
    let characterIndex = 0;
    let finalString = "";
    for (let i = 1; i < states.length; i++) {
        console.log("\n Estado " + states[i].id);
        if (states[i].isBreakPoint) {
            console.log("\tis Breakpoint ");
            finalString += "\u25CF";
        } else if (ids.includes(states[i].id)) {
            console.log("\tis repeated ");
            // If this is a repeated state, due to backtracking, do not add it to the string
            continue;
        } else {
            console.log("\tis new ");
            finalString += str.charAt(characterIndex);
            characterIndex += 1;
            ids.push(states[i].id);
        }
    }
    return finalString;
}*/

/*

//GET INDEXES OF BREAKPOINT 

let breakPointString = "[!]";
    let index = 0;
    let occurrencesIndex = [];

    //no breakpoint, return the same string
    if (regex.indexOf(breakPointString) == -1) return regex;

    //get indexes of all occurences of the breakpoint
    while ((index = regex.indexOf(breakPointString, ++index)) != -1) {
        occurrencesIndex.push(index);
    }

*/

function placeBreakPoints(regex) {
    let breakPointString = "[!]";
    let breakPointVisual = "\u25CF";

    return regex.split(breakPointString).join(breakPointVisual);
}

/**
 * str - Regular expression to highlight, containing expressions inside [ ]
 * state - the actual state to highlight, containing information on Loc and InnerLoc
 * noHTML - true, in case we want to return the whole expression.
 *              ex:   ab[a-zA-Z]cd   ->   ab[ <div>a-z</div> A-Z]cd
 *        - false, in case we only want the expression inside characters [ ], mostly for the Tree-Step
 *              ex:   ab[a-zA-Z]cd   ->   [ <div>a-z</div> A-Z]
 */
function getCharacterRangeInnerLocIndexes(str, state, noHTML) {
    // console.log("getCharacterRangeInnerLocIndexes");
    //if (str == "") return "";
    /*str = "bb[a-zA-Z]cc";
    state = {
        innerLoc: { from: "a", to: "z" },
        loc: { source: "[a-zA-Z]", start: "3", end: "11" },
        msg: "characterSetMatcher",
    };*/
    //console.log("--------------------");
    //console.log(state);
    let loc_start = state.loc.start; // Loc indexes start at 1, not 0
    let loc_end = state.loc.end;
    let before = str.substring(0, loc_start - 1);
    let range = str.substring(loc_start - 1, loc_end - 1);
    let after = str.substring(loc_end - 1, str.length);
    let innerLoc_from = state.innerLoc.from;
    let innerLoc_to = state.innerLoc.to;
    let innerHighlight_from = null;
    let innerHighlight_to = null;
    let innerHighlight_from_isCalculated = false;
    let innerHighlight_to_isCalculated = false;
    //console.log(innerLoc_from);
    //console.log(innerLoc_to);
    if (innerLoc_to == "from") innerHighlight_to_isCalculated = true;

    //ignore first and last iteration so we dont recognize [ and ] as characters
    for (let i = 1; i < range.length - 1; i++) {
        if (range[i] == innerLoc_from && !innerHighlight_from_isCalculated) {
            innerHighlight_from = i;
            innerHighlight_from_isCalculated = true;
        } else if (!innerHighlight_to_isCalculated && range[i] == innerLoc_to) {
            innerHighlight_to = i;
            innerHighlight_to_isCalculated = true;
        }
    }

    if (innerLoc_to == "from") innerHighlight_to = innerHighlight_from;

    let beforeInner = range.substring(0, innerHighlight_from);
    let rangeInner = range.substring(innerHighlight_from, innerHighlight_to + 1);
    let afterInner = range.substring(innerHighlight_to + 1, range.length);
    //If it it a negative range, innerLoc is false, detect this and highlight all characters inside square brackets
    if(!state.innerLoc) {
        beforeInner = range.substring(0, 1);
        rangeInner = range.substring(1, range.length - 1);
        afterInner = range.substring(range.length - 1, range.length);
    }
    //console.log(beforeInner + "  ,  " + rangeInner + "  ,  " + afterInner);

    if (noHTML) return rangeInner;

    let innerString = `${beforeInner}<div class="white-text">${rangeInner}</div>${afterInner}`;
    //console.log(innerString);

    return `${before}${innerString}${after}`;
}

/* HTML template with all the information for a given state */
function printState(state) {
    let newCaptures = state.captures.filter(function (element) {
        return element !== undefined;
    });
    return `<div id="regexStateHighlight_wrapper" class="stateHighlight"><div class="stateTitle">Regex:</div><div id="stateWrapper"><div id="stateRegex"> ${
        stateObject.regex
    }</div></div></div>
    <div id="stateHighlight_wrapper" style="margin-top: -25px" class="stateHighlight"><div class="stateTitle">String:</div><div id="stateWrapper"><div id="stateValue"> ${
        state.str
    }</div></div></div> <div class="stateData">
    <div class="stateDataGroup"><span class="stateDataField">ID:</span> [${state.id}] </div>
    <div class="stateDataGroup"><span class="stateDataField">Captures:</span> [${newCaptures}] </div>
    <div class="stateDataGroup"><span class="stateDataField">End Index:</span> ${state.end_index} </div>
    <div class="stateDataGroup"><span class="stateDataField">Is Break Point:</span> ${state.isBreakPoint} </div>
    <div class="stateDataGroup"><span class="stateDataField">Is Failure:</span> ${state.isFailure || state.failure || false} </div>
    ${
        state.loc && Object.keys(state.loc).length !== 0
            ? `<div class="stateDataGroup"><span class="stateDataField">Loc:</span> {${state.loc.source}, ${state.loc.start}, ${state.loc.end}} </div> `
            : `<div class="stateDataGroup"><span class="stateDataField">Loc:</span> {} </div>`
    }
    <div class="stateDataGroup"><span class="stateDataField">n_caps:</span> ${state.n_caps} </div>
    <div class="stateDataGroup"><span class="stateDataField">String:</span> ${state.str} </div>
    `;
} //<div id="stateString"></div></div> estava na ultima linha

/* This function injects an html div, which highlights the state from index '0' to index 'end'. */
function styleString(state, start, end, isFail) {
    /*console.log(state);
    console.log(start);
    console.log(end);*/
    const stateHighlight_elm = document.getElementById("stateHighlight_wrapper");
    const stringToHighlight = stateObject.str;
    const stringLength = stateObject.strLength;
    let preHighlight = "";
    let posHighlight = "";
    let finalString = "";
    let endClass = "";
    let startClass = "";
    let innerStartClass = ""; //TODO
    let msg_failed = "";
    /*
    if (state.initial || (start == state.end_index && Object.keys(state.loc).length === 0 && state.loc.constructor === Object)) {
        startClass = "start";
    } else {
        preHighlight = stringToHighlight.substring(0, start);
        innerStartClass ="start";
    }*/

    // If this is NOT the end state, do not highlight the remaining substring)
    if (start != 0) {
        preHighlight = stringToHighlight.substring(0, start);
        innerStartClass = "start"; //TODO
    } else {
        startClass = "start";
    }
    if (end != stringLength) {
        posHighlight = stringToHighlight.substring(end + 1, stringLength);
    } else {
        endClass = "end"; // If this is the end state, visually represent it
    }

    // If this is the initial state, visually represent it (no highlight needed in the string)
    if (state.initial && start === 0) {
        //TODO
        finalString = `<div class="stateTitle">String:</div> <div id="stateValue" class="${startClass}"> ${stringToHighlight}</div>`;
    } else if (state.initial) {
        let highlight = stringToHighlight.substring(start, stringLength);
        finalString = `<div class="stateTitle">String:</div> <div id="stateWrapper"><div id="stateValue"> ${preHighlight}<div class="highlighted2 ${innerStartClass}">${highlight}</div></div>`;
        // Make ::after on preHighlight
    } else {
        // If this is NOT the initial state, highlight the given substring)
        let highlight = stringToHighlight.substring(start, end + 1);
        let highlight_fail = "";
        if (isFail) {
            highlight = stringToHighlight.substring(start, end);
            highlight_fail = stringToHighlight.substring(end, end + 1);
        }

        //special reading for last state // as end_index always increments 1 at the end state.
        if (Object.keys(state.loc).length === 0 && state.loc.constructor === Object) {
            //state.loc solves the error, but introduces another TODO
            highlight = stringToHighlight.substring(start, end);
            posHighlight = stringToHighlight.substring(end, stringLength);
        } else if (state.failure) {
            highlight = "";
            highlight_fail = "";
            msg_failed = "Failed";
            endClass = "";
            posHighlight = "";
            preHighlight = "";
            startClass = "";
            innerStartClass = ""; //TODO
        }
        finalString = `<div class="stateTitle">String:</div> <div id="stateWrapper"><div id="stateValue" class="${startClass} ${endClass}"> ${preHighlight}<div class="highlighted ${innerStartClass}">${highlight}</div><div class="highlighted_fail">${highlight_fail}</div>${posHighlight}</div><div class="msg_failed">${msg_failed}</div></div>`;
    }

    stateHighlight_elm.innerHTML = finalString; // Inject the string with the highlighted substring into the HTML
}

/* This function injects an html div, which highlights the regular expression from index '0' to index 'end'. */
/*function styleRegex(state) {
    const stateHighlight_elm = document.getElementById("regexStateHighlight_wrapper");
    const regex = stateObject.regex;
    const regexLength = regex.length;
    const stringToHighlight = placeBreakPoints(regex);
    const loc = state.loc;
    const start = 0;

    let posHighlight = "";
    let finalString = "";
    let endClass = "";

    if (state.initial) return; // Check if this is the initial state, which is visually represented at all times

    let end = regexLength;
    // If this is NOT the end state, do not highlight the remaining substring)

    if (Object.keys(loc).length === 0 && loc.constructor === Object) {
        endClass = "end";
    } else {
        end = loc.end - 1;
        posHighlight = regex.substring(end, regexLength);
    }

    // If this is the initial state, visually represent it (no highlight needed in the string)
    if (state.initial) {
        finalString = `<div class="stateTitle">String:</div> <div id="stateValue" class="${endClass}"> ${regex}</div>`;
    } else {
        // If this is NOT the initial state, highlight the given substring)
        let highlight = regex.substring(start, end);
        finalString = `<div class="stateTitle">Regex:</div> <div id="stateRegex" class="${endClass}"> <div class="highlighted">${highlight}</div>${posHighlight}</div>`;
    }

    // Inject the string with the highlighted substring into the HTML
    stateHighlight_elm.innerHTML = finalString;
}*/

function styleRegex(state, index, isFail) {
    const stateHighlight_elm = document.getElementById("regexStateHighlight_wrapper");
    const regex = stateObject.regex;
    const breakPoint = "[!]";
    const breakPointLength = breakPoint.length - 1; // -1 because the new representation occupies 1 length of space
    const stringToHighlight = placeBreakPoints(regex);
    const regexLength = stringToHighlight.length;
    const loc = state.loc;
    const start = 0;

    let posHighlight = "";
    let finalString = "";
    let endClass = "";
    let isBP = 0;
    let nOfBreakPoints = 0;
    //nOfBreakPoints = numberOfBreakPoints(index);
    let locEnd = regexLength;
    if (loc) locEnd = loc.end;
    nOfBreakPoints = numberOfBreakPoints(regex, locEnd);
    // If current state is a breakpoint, isBP will take care of it, we can
    //subtract 1 to the nOfBreakPoints var and rely only on isBP for this particular BP
    if (state.isBreakPoint) {
        isBP = 2;
        nOfBreakPoints--;
    }

    let end = regexLength;
    let newEnd = regexLength;

    let start_fail = null;
    let newStart_fail = null;
    let end_fail = regexLength;
    let newEnd_fail = regexLength;

    // If this is NOT the end state, do not highlight the remaining substring)
    if (state.initial) {
        finalString = `<div class="stateTitle">Regex:</div> <div id="stateWrapper"><div id="stateRegex" class="${endClass}"> ${stringToHighlight}</div></div>`;
    } else if (Object.keys(loc).length === 0 && loc.constructor === Object) {
        endClass = "end";
    } else if (isFail) {
        end = loc.start - 1;
        newEnd = end - isBP - breakPointLength * nOfBreakPoints;
        start_fail = loc.start - 1;
        end_fail = loc.end - 1;
        newStart_fail = start_fail - isBP - breakPointLength * nOfBreakPoints;
        newEnd_fail = end_fail - isBP - breakPointLength * nOfBreakPoints;
        posHighlight = stringToHighlight.substring(newEnd_fail, regexLength);
    } else {
        end = loc.end - 1;
        newEnd = end - isBP - breakPointLength * nOfBreakPoints;
        posHighlight = stringToHighlight.substring(newEnd, regexLength);
    }

    // If this is the initial state, visually represent it (no highlight needed in the string)
    if (!state.initial) {
        // If this is NOT the initial state, highlight the given substring)
        let highlight_fail = "";
        let highlight = stringToHighlight.substring(start, newEnd);
        if (isFail) {
            highlight_fail = stringToHighlight.substring(newStart_fail, newEnd_fail);
        } else if (
            state.msg == "characterSetMatcher" &&
            state.loc.source.includes("[") &&
            state.loc.source.includes("]") &&
            typeof state.innerLoc !== "undefined" &&
            state.innerLoc != true
        ) {
            highlight = getCharacterRangeInnerLocIndexes(highlight, state, false);
        }

        finalString = `<div class="stateTitle">Regex:</div> <div id="stateWrapper"><div id="stateRegex" class="${endClass}"> <div class="highlighted">${highlight}</div><div class="highlighted_fail">${highlight_fail}</div>${posHighlight}</div></div>`;
    }

    // Inject the string with the highlighted substring into the HTML
    stateHighlight_elm.innerHTML = finalString;
}

function cleanScrollMemoryOnCompile() {
    window.localStorage.setItem("regexScroll", null);
    window.localStorage.setItem("stringScroll", null);
}

function saveScrollPosition() {
    let regexScroll = document.querySelector("#regexStateHighlight_wrapper #stateWrapper");
    let stringScroll = document.querySelector("#stateHighlight_wrapper #stateWrapper");
    if(regexScroll && regexScroll.scrollWidth > regexScroll.clientWidth) {
        window.localStorage.setItem("regexScroll", regexScroll.scrollLeft);
    }
    if(stringScroll && stringScroll.scrollWidth > stringScroll.clientWidth) {
        window.localStorage.setItem("stringScroll", stringScroll.scrollLeft);
    }
}

function getScrollPosition() {
    let regexScroll = document.querySelector("#regexStateHighlight_wrapper #stateWrapper");
    let stringScroll = document.querySelector("#stateHighlight_wrapper #stateWrapper");
    if(regexScroll && regexScroll.scrollWidth > regexScroll.clientWidth && window.localStorage.getItem("regexScroll")) {
        let scroll = window.localStorage.getItem("regexScroll");
        regexScroll.scrollLeft = scroll;
    }
    if(stringScroll && stringScroll.scrollWidth > stringScroll.clientWidth && window.localStorage.getItem("stringScroll")) {
        let scroll = window.localStorage.getItem("stringScroll");
        stringScroll.scrollLeft = scroll;
    }
}

/* Debugg buttons are disabled until a given Regex is compiled successfully */
function enableAllDebugButtons() {
    var debuggButtons = document.querySelectorAll(".debugNavigation");
    for (let i = 0; i < debuggButtons.length; i++) {
        enableDebugButton(debuggButtons[i]);
    }
}

function disableAllDebugButtons() {
    var debuggButtons = document.querySelectorAll(".debugNavigation");
    for (let i = 0; i < debuggButtons.length; i++) {
        disableDebugButton(debuggButtons[i]);
    }
}

function enableDebugButton(elm) {
    elm.disabled = false;
}

function disableDebugButton(elm) {
    elm.disabled = true;
}

function cleanDiv(elm) {
    elm.innerHTML = "";
}

/************************************************ Listeners / Jquery ************************************************/

// Manually resize the monaco editor, which has a lot of problems on resizing with the window
window.addEventListener("resize", function () {
    editor.layout();
});

// "$(document).ready(func..." is deprecated has of jQuery 3.0, now its "$(func..." only
$(function () {
    // Get the current year on the footer
    document.getElementById("copyright").innerHTML = new Date().getFullYear();


    const userAgent = navigator.userAgent;
    if(!userAgent.includes("Chrome") && !userAgent.includes("Firefox")) {
        console.log("Browser is not supported");
        document.querySelector(".popup").style.display = "block";
    }

    // const userAgent = navigator.userAgent;
    // if(userAgent.indexOf("Chrome") === -1 && userAgent.indexOf("Firefox") === -1) {
    //     document.querySelector(".popup").style.display = block;
    // }

    // Update active menu links on click
    /*
    $(".navbar .collapse.navbar-collapse .nav-item").on("click", function () {
        $(".navbar .collapse.navbar-collapse").find(".active").removeClass("active");
        $(this).addClass("active");
    });*/

    // document.querySelectorAll(".dropdown-item").forEach(function(element) {
    //     element.addEventListener('click', function() { 
    //         changeEditorValue(element);
    //     });
    // });

    
    $(".dropdown-item").each(function () {
        var item = this;
        item.addEventListener("click", function(event) {
            event.preventDefault();
            changeEditorValue(item);
        });
    });



    $("#toggleExpansion").on("click", function () {
        if($("#toggleExpansion").text() === "Expand Tree") {
            expandAll();
            $("#toggleExpansion").text("Collapse Tree");
        } else {
            collapseAll();
            $("#toggleExpansion").text("Expand Tree");
        }
    });

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if(e.target.id === "tree-tab"){
            if($("#message").hasClass("clean")){
                $("#toggleExpansion").css("display", "block");
            }
        }
        else {
            $("#toggleExpansion").css("display", "none");
        }
    });

});

/************************************************ TREE ************************************************/

class Node {
    constructor(node, left, right) {
        this.node = node;
        this.leftChild = left;
        this.rightChild = right;
    }
}

function listToTree(list) {
    if (list.length === 0) return []; //maybe without null

    let [head, ...tail] = list;
    if (head.branch || head.backtrack) {
        let tree = listToTree(tail);
        return node1(head, tree);
    }
    if (nodeExists(head, tail)) {
        let leftList = left(head, tail);
        let rightList = right(head, tail);
        let leftTree = listToTree(leftList);
        let rightTree = listToTree(rightList);
        return node2(head, leftTree, rightTree);
    } else {
        let tree = listToTree(tail);
        return node1(head, tree);
    }
}

function node2(node, left, right) {
    return new Node(node, left, right);
}
function node1(node, tail) {
    return new Node(node, tail, null); //maybe without null
}

function nodeExists(node, tail) {
    for (let n of tail) {
        if (node.id == n.id && !node.isBreakPoint && !node.backtrack && !node.branch) {
            return true;
        }
    }
    return false;
}

function getBacktrackNodeId(id, tail) {
    for (let n of tail) {
        if (id == n.id && n.backtrack) {
            return n.id;
        }
    }
    return null;
}

// Calculates left branch of a repeating node
function left(node, tail, id) {
    let leftList = [];
    for (let i = 0; i < tail.length; i++) {
        let n = tail[i];
        if (n.id == id && n.backtrack) {
            return leftList;
        } else {
            leftList.push(n);
        }
    }
}

// Calculates right branch of a repeating node
function right(node, tail, id) {
    let isRightSide = false;
    let rightList = [];
    for (let i = 0; i < tail.length; i++) {
        let n = tail[i];
        if (n.id == id && n.backtrack) {
            isRightSide = true;
        } else if (!isRightSide) {
            continue;
        } else if (isRightSide) {
            rightList.push(n);
        }
    }
    return rightList;
}

/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/******************************************************************************************************/
/************************************************ TREE (D3) *******************************************/

/* Func - receive a tree and insert the nodes in treeData var */

function node2D3(name, node, arr) {
    let nodes = [];
    let allNull = true;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].length !== 0) {
            nodes.push(arr[i]);
            allNull = false;
        }
    }
    if (allNull) return new NodeD3(name, node, null);
    return new NodeD3(name, node, nodes);
}
/*
function node2D3(name, node, left, right) {
    if (left.length === 0 && right.length === 0) return new NodeD3(name, node, null);
    if (left.length === 0) return new NodeD3(name, node, [right]);
    if (right.length === 0) return new NodeD3(name, node, [left]);
    return new NodeD3(name, node, [left, right]);
}*/
function node1D3(name, node, tail) {
    if (tail === null || tail.length === 0) return new NodeD3(name, node, null);
    return new NodeD3(name, node, [tail]);
}

class NodeD3 {
    constructor(name, node, arr) {
        this.name = name;
        this.node = node;
        this.children = arr;
    }
}

function cleanTree(tree) {
    let newTree = [];
    for (let i = 0; i < tree.length; i++) {
        if (!tree[i].branch && !tree[i].failure) newTree.push(tree[i]);
    }
    return newTree;
}

function traceToD3Tree(trace) {
    if (!trace || trace.length === 0) return [];

    let [head, ...tail] = trace;
    if (!head) return [];

    //if (head.msg === "getGroupMatcher") head.end_index = head.end_index - 1;

    if (getBacktrackNodeId(head.id + 1, tail) != null) {
        let id = getBacktrackNodeId(head.id + 1, tail);
        let leftList = left(head, tail, id);
        let rightList = right(head, tail, id);
        let leftTree = traceToD3Tree(leftList);
        let rightTree = traceToD3Tree(rightList);
        let name = `State ${head.id}`;
        return node2D3(name, head, [leftTree, rightTree]);
    } else {
        let name = `State ${head.id}`;
        let tree = traceToD3Tree(tail);
        return node1D3(name, head, tree);
    }
}

var treeData = {};

// Set the dimensions and margins of the diagram
var margin = { top: 20, right: 90, bottom: 30, left: 90 },
    width = 1160 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
// TODO1
var svg = null;

var i = 0,
    duration = 400, // duration of opening a node transition
    root;

// declares a tree layout and assigns the size
var treemap = null;

//NEW FUNCS
function expand(d){   
    if (d._children) {        
        d.children = d._children;
        d._children = null;       
    }
    var children = (d.children)?d.children:d._children;
    if(children)
      children.forEach(expand);
}
    
function expandAll(){
    expand(root); 
    update(root);
}
    
function collapseAll(){
    root.children.forEach(collapse);
    collapse(root);
    update(root);
}

function defineTreeVars() {
    d3.select("svg").remove();

    margin = { top: 20, right: 90, bottom: 30, left: 90 };
    width = 155 * stateObject.states.length - margin.left - margin.right;
    height = 400 - margin.top - margin.bottom;
    document.getElementById("treeWindow").innerHTML = "";
    svg = d3
        .select("#treeWindow")
        .append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    i = 0;
    duration = 400; // duration of opening a node transition
    root;

    // declares a tree layout and assigns the size
    treemap = d3.tree().size([height, width]);
}

function initializeTree(treeData) {
    // Assigns parent, children, height, depth
    //console.log(treeData);
    root = d3.hierarchy(treeData, function (d) {
        return d.children;
    });
    root.x0 = height / 2;
    root.y0 = 0;

    // Collapse after the second level
    if(root.children) root.children.forEach(collapse); //nao devia ser assim porque todas as arvores deviam ter mais um estado para alem do inicial
    // root.children.forEach(collapse);

    // TODO1 PLACE svg object here, only declare it outside this func

    update(root);
}

// Was not commented
//update(root);

// Collapse the node and all it's children
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function update(source) {
    // Assigns the x and y position for the nodes
    var treeData = treemap(root);

    // Compute the new tree layout.
    var nodes = treeData.descendants(),
        links = treeData.descendants().slice(1);

    // Normalize for fixed-depth.
    nodes.forEach(function (d) {
        d.y = d.depth * 150; //previously 180
    });

    // ****************** Nodes section ***************************

    // Update the nodes...
    var node = svg.selectAll("g.node").data(nodes, function (d) {
        return d.id || (d.id = ++i);
    });

    // Enter any new modes at the parent's previous position.
    var nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on("click", click);

    // Add Circle for the nodes
    nodeEnter
        .append("circle")
        .attr("class", "node")
        .attr("r", 1e-6)
        .style("fill", function (d) {
            let n = d.data.node;
            if (n.loc && Object.keys(n.loc).length === 0 && n.loc.constructor === Object) return d._children ? "#7FBF7F" : "#7FBF7F";
            if (n.isFailure || n.failure) return d._children ? "#FF7F7F" : "#FF7F7F";
            return d._children ? "lightsteelblue" : "#fff";
        });

    // Add labels for the nodes
    nodeEnter
        .append("text")
        .attr("dy", "-0.6em")
        .attr("x", function (d) {
            return d.children || d._children ? -13 : 13;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .style("font-weight", "bold")
        .text(function (d) {
            return d.data.name;
        });

    // Add labels for the nodes
    nodeEnter
        .append("g")
        .append("rect")
        .attr("x", -120)
        .attr("y", -6)
        .attr("width", 108)
        .attr("height", 14)
        .attr("fill", "#F4F4F4")
        .style("opacity", "0.7");
    nodeEnter
        .append("text")
        .attr("dy", "0.4em")
        .attr("x", function (d) {
            return d.children || d._children ? -13 : 13;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .text(function (d) {
            let node = d.data.node;
            if (!node) return "";
            if (node.isBreakPoint) return `Breakpoint \u25CF`;
            if (node.epsilon) return '\u03B5';
            if (node.isFailure || node.failure) {
                // if(node.msg == "characterSetMatcher" && node.loc) {
                //     if(node.loc.source.includes("[^") && node.loc.source.includes("]")) {
                //         return "Failed: [^......]";
                //     }
                //     else if(node.loc.source.includes("[") && node.loc.source.includes("]")) {
                //         return `Failed: ${d.data.node.loc.source}`;
                //     }
                if(node.loc.source.length > NODE_TEXT_MAX_SIZE) return `Failed: ${node.loc.source.substring(0,NODE_TEXT_MAX_SIZE-10)}...`;
                return `Failed: ${d.data.node.loc.source}`;
                // }
            }
            if (node.loc && Object.keys(node.loc).length === 0 && node.loc.constructor === Object) return "Final Node";
            if (
                node.msg == "characterSetMatcher" &&
                node.loc &&
                node.loc.source.includes("[") &&
                node.loc.source.includes("]") &&
                typeof node.innerLoc !== "undefined" &&
                node.innerLoc != true
            ) {
                // if(node.loc.source.includes("[^") && node.loc.source.includes("]")) {
                //     return "[^......]";
                // }
                // else 
                if(node.loc.source.includes("[") && node.loc.source.includes("]")) {
                    if(node.loc.source.length > NODE_TEXT_MAX_SIZE) return node.loc.source.substring(0,NODE_TEXT_MAX_SIZE)+'...';
                    return node.loc.source;
                }
                // return node.loc.source;
                //remake loc so that we only work with the character range and forget prefix and suffix of it (rest of the expression)
                /*
                let l = { source: node.loc.source, start: 1, end: node.loc.source.length + 1 };
                let n = { innerLoc: node.innerLoc, loc: l };
                return getCharacterRangeInnerLocIndexes(node.loc.source, n, true); */
                //return node.loc.source;
            }
            if (node.loc) {
                if(node.loc.source.length > NODE_TEXT_MAX_SIZE) return node.loc.source.substring(0,NODE_TEXT_MAX_SIZE)+'...';
                return node.loc.source;
            }
            if (node.initial) return "Initial Node";
            return "";
        });


        nodeEnter
        .append("text")
        .attr("dy", "1.4em")
        .attr("x", function (d) {
            return d.children || d._children ? -13 : 13;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .style("font-weight", "bold")
        .text(function (d) {
            let node = d.data.node;
            if(!node.epsilon && !node.backtrack && !node.branch) {
                let str = node.str;
                let index = node.end_index;
                let input_string = str.substring(index, index + 1);
                if(node.initial) return "";
                if(node.loc && Object.keys(node.loc).length === 0 && node.loc.constructor === Object) return "";
                if(node.msg === "getGroupMatcher") return "Group"; //case of backreference is also special because is does not read only 1 character //TODO
                if(node.msg === "getLookaheadAssertion") return "Lookahead";
                if(node.msg === "backReferenceMatcher") {
                    let newCaptures = node.captures.filter(function (element) {
                        return element !== undefined;
                    });
                    return newCaptures[newCaptures.length - 1];
                }
                return input_string;
            }
            return "";
        });
        


        /* // part of inner loc:   "of [loc]"
    nodeEnter
        .append("text")
        .attr("dy", "2.2em")
        .attr("x", function (d) {
            return d.children || d._children ? -13 : 13;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .text(function (d) {
            let node = d.data.node;
            if (
                node.msg == "characterSetMatcher" &&
                node.loc &&
                node.loc.source.includes("[") &&
                node.loc.source.includes("]") &&
                typeof node.innerLoc !== "undefined" &&
                node.innerLoc != true
            ) {
                return `of ${node.loc.source}`;
            }
            return "";
        });
        */
    
    // METER info da INPUT STRING AQUI
    // TODO


    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate
        .transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Update the node attributes and style
    nodeUpdate
        .select("circle.node")
        .attr("r", 10)
        .style("fill", function (d) {
            let n = d.data.node;
            if (n.loc && Object.keys(n.loc).length === 0 && n.loc.constructor === Object) return d._children ? "#7FBF7F" : "#7FBF7F";
            if (n.isFailure || n.failure) return d._children ? "#FF7F7F" : "#FF7F7F";
            return d._children ? "lightsteelblue" : "#fff";
        })
        .attr("cursor", "pointer");

    // Remove any exiting nodes
    var nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select("circle").attr("r", 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select("text").style("fill-opacity", 1e-6);

    // ****************** links section ***************************

    // Update the links...
    var link = svg.selectAll("path.link").data(links, function (d) {
        return d.id;
    });

    // Enter any new links at the parent's previous position.
    var linkEnter = link
        .enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("d", function (d) {
            var o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        });

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate
        .transition()
        .duration(duration)
        .attr("d", function (d) {
            return diagonal(d, d.parent);
        });

    // Remove any exiting links
    var linkExit = link
        .exit()
        .transition()
        .duration(duration)
        .attr("d", function (d) {
            var o = { x: source.x, y: source.y };
            return diagonal(o, o);
        })
        .remove();

    // Store the old positions for transition.
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {
        path = `M ${s.y} ${s.x}
C ${(s.y + d.y) / 2} ${s.x},
  ${(s.y + d.y) / 2} ${d.x},
  ${d.y} ${d.x}`;

        return path;
    }

    // Toggle children on click.
    function click(event, d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
}
