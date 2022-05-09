var id = 0;

// TODO: check this syntax is supported
/*
function state(str, n_caps, e, caps, old_states, loc) {
    return {
        str,
        n_caps,
        end_index: e,
        captures: caps,
        old_states: old_states || [],
        id: id++,
        loc: loc,
    };
}*/

function resetIdCounter() {
    id = 0;
}

function state(msg, str, n_caps, e, caps, old_states, loc, iid) {
    let newId = iid || id++;

    let s = {
        str,
        n_caps,
        end_index: e,
        captures: caps,
        old_states: old_states || [{ str: str, n_caps: n_caps, end_index: e, captures: caps, isBreakPoint: false, id: newId, initial: true }],
        id: newId,
        loc: loc || {},
        msg: msg,
    };
    // console.log("oooooooooooooooooooooooooooooooooooooo");
    // console.log(s);
    return s;
}

function duplicateHead(state) {
    // console.log("oooooooooooooooooooooooooooooooooooooo");
    // console.log(state);
    state.id = id++;
}

function str(s) {
    return s.str;
}

function nCaps(s) {
    return s.n_caps;
}

function endIndex(s) {
    return s.end_index;
}

function captures(s) {
    return s.captures;
}

function getId(s) {
    return s.id;
}

function stateSetLoc(s, loc) {
    // console.log("loooooooooooooooooooooooooooooooooooooooc");
    // console.log(loc);
    s.loc = loc;
}

function stateSetInnerLoc(s, innerLoc) {
    s.innerLoc = innerLoc;
}

// Adding Loc to the save function?
function save(ret, state, b, source, startOffset, endOffset) {
    if (b) {
        let loc = {
            source: source,
            start: startOffset,
            end: endOffset,
        };
        // console.log("oooooooooooooooooooooooooooooooooooooo");
        // console.log(loc);
        state.old_states.push({
            str: state.str,
            n_caps: state.n_caps,
            end_index: state.end_index,
            captures: state.captures.map((x) => x),
            isBreakPoint: b,
            id: state.id,
            loc: loc,
            innerLoc: state.innerLoc,
            msg: ret.msg,
        });
    } else {
        // console.log("oooooooooooooooooooooooooooooooooooooo");
        // console.log(state.loc);
        state.old_states.push({
            str: state.str,
            n_caps: state.n_caps,
            end_index: state.end_index,
            captures: state.captures.map((x) => x),
            isBreakPoint: b,
            id: state.id,
            loc: state.loc,
            innerLoc: state.innerLoc,
            msg: ret.msg,
        });
    }
}

function saveBacktrack(state, _id) {
    state.old_states.push({ id: _id, backtrack: true });
    state.id = id++;  
}

function saveBacktrackEpsilon(state, _id) {
    // state.id = id++;
    // state.old_states.push({ id: _id, backtrack: true });
    
    state.old_states.push({ id: _id, backtrack: true });
    state.old_states.push({ id: id++, epsilon: true });
    // console.log("oooooooooooooooooooooooooooooooooooooo");
    // console.log(id);
    state.id = id++;          // Assim temos um id de failure igual ao proximo epsilon (na ultima bifurcação)
    //state.id = id++;      // Assim perdemos um ID quando a seguir ao epsilon nao temos failure (depois da ultima bifurcação)
    // console.log(id);
    //state.old_states.push({ id: id++, epsilon: true });
}

function saveBranch(state, _id) {
    state.old_states.push({ id: _id, branch: true });
}

function saveBranchEpsilon(state, _id) {
    console.log(_id);
    state.old_states.push({ id: _id, branch: true });
    state.old_states.push({ id: _id, epsilon: true });
    state.id = id++;
}

function saveFailure(state, failure) {
    // console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    // console.log(failure);
    state.old_states.push({
        str: state.str,
        n_caps: state.n_caps,
        end_index: state.end_index,
        captures: state.captures.map((x) => x),
        isBreakPoint: false,
        id: failure.id,
        loc: failure.loc,
        isFailure: true,
        msg: failure.msg,
    });
}

function oldStates(state) {
    return state.old_states;
}

export { state, str, nCaps, endIndex, captures, save, saveBacktrack, saveBacktrackEpsilon, saveBranch, saveBranchEpsilon, saveFailure, oldStates, getId, stateSetLoc, stateSetInnerLoc, duplicateHead, resetIdCounter };
