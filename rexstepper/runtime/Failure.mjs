
function makeSuccess(s) {
    if (!isFailure(s)) {
        return s;
    } else {
        throw Error("Match result has failed");
    }
}

function isFailure(f) {
    return f === null || f.failure;
}

// added id, n_caps, captures, end_index
function makeFailure(msg, loc, state) {
    return {
        failure: true,
        str: state.str,
        loc: loc,
        old_states: state.old_states,
        id: state.id,
        n_caps: state.n_caps,
        end_index: state.end_index,
        captures: state.captures.map((x) => x),
        msg: msg,
    };
}

function resultState(r) {
    if (!isFailure(r)) {
        return r;
    } else {
        throw Error("Match result has failed");
    }
}

export { makeSuccess, isFailure, makeFailure, resultState };
