/*
  trace - array of states
  trees - array of NodeD3 objects
*/
function trace2tree(trace, trees) {
    if(trace.length == 0)
        return trees[0];
    else {
        let currentState = trace.pop(); // pop() updates trace, ready for the next iteration
        
        if(currentState.branch == true) {
            if(trees.length >= 2) {
                // get last 2 inserted trees, create "br" node and add trees to its children
                let treeLeft = trees.pop();
                let treeRight = trees.pop();
                
                let name = 'BR';
                var br = node2D3(name, currentState, [treeLeft, treeRight]);
        
                trees.push(br);
                return trace2tree(trace, trees);
            } else {
                // get last inserted tree, create "br" node and add tree to its children
                let tree = trees.pop();
        
                let name = 'BR';
                var br = node1D3(name, currentState, tree);
        
                trees.push(br);
                return trace2tree(trace, trees);
            }
        } else if(currentState.isFailure == true) {
            // create "dt v" node and push it to trees array -> makes Failure node an independent branch (required due to BT removal)
            let name = 'State ' + currentState.id;
            var node = node1D3(name, currentState, null);

            currentState.node = node; // part of the solution to enable tree view knowledge of code-stepper's current state
    
            trees.push(node);
            return trace2tree(trace, trees);
        } else {
            // get last inserted tree, create "init" or "dt v" node and add tree to its children
            let tree = trees.pop();
    
            let name = 'State ' + currentState.id;
            var node = node1D3(name, currentState, tree);

            currentState.node = node; // part of the solution to enable tree view knowledge of code-stepper's current state
    
            trees.push(node);
            return trace2tree(trace, trees);
        }
    }
}

/**
 * Removes last failure state and backtrack states
 */
function cleanTrace(trace) {
    let newTrace = [];
    for (let i = 0; i < trace.length; i++) {
        if(trace[i].failure == true) {}
        else if(trace[i].backtrack == true) {}
        else if(verbose.ignoreEpsilonStates == true && trace[i].epsilon == true) {}
        else {
            newTrace.push(trace[i]);
        }
    }
    return newTrace;
}

/**
 * Required first call to trace2tree method
 * @param {} originalTrace reference to stateObject.states
 * @returns NodeD3 structure
 */
function buildD3Tree(originalTrace) {
    let trace = cleanTrace(originalTrace);

    // 1st method call
    let currentState = trace.pop();

    let name = 'State ' + currentState.id;
    var end = node1D3(name, currentState, null);

    currentState.node = end; // part of the solution to enable tree view knowledge of code-stepper's current state

    let trees = [end];
    var resultTree = trace2tree(trace, trees);
    return resultTree;
}

$("#toggleFullscreen").on("click", function () {

    if($('#tree').hasClass('fullscreen')) {
        $('#tree').removeClass('fullscreen');
        $('#treeWindow').css('max-height', '400px');
        $('#treeOps').removeClass('fullscreen-tree-ops');
    } else {
        $('#tree').addClass('fullscreen');
        $('#treeWindow').css('max-height', '100%'); // default value by previous developer
        $('#treeOps').addClass('fullscreen-tree-ops');
    }
});

/************************************* GNZ *************************************/

function prepTreeForScreenshot() {
    $('#treeWindow').attr('style', function(i,s) { return (s || '') + 'background-color: white !important;' });

    var edges = $('rect');
    for(var i=0; i<edges.length; i++) {
        $(edges[i]).css('opacity', '0');
    }

    var nodes = $('g.node');
    for(var i=0; i<nodes.length; i++) {
        var node = nodes[i];
        var circle = $(node).children().filter('circle');
        var lbls = $(node).children().filter('text');

        if($(circle).css('fill') == 'rgb(255, 127, 127)') { // is failure
            if(lbls.length > 2)
                $(lbls[lbls.length-1]).remove();
        } else if(lbls.length >= 3 && $(lbls[2]).text() != '') {
            $(lbls[2]).text($(lbls[1]).text());
            $(lbls[2]).css('font-weight', 'normal');

            $(lbls[1]).remove();
        }
    }
}