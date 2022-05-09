//import util from "util";

// test var
let testList = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 1 }, { id: 4 }, { id: 5 }, { id: 6 }];

class Node {
    constructor(node, left, right) {
        this.node = node;
        this.leftChild = left;
        this.rightChild = right;
    }
}

//call this with globalRet.old_states as arg.
function listToTree(list) {
    if (list.length === 0) {
        return null;
    } else {
        let [head, ...tail] = list;
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
}

function node2(node, left, right) {
    return new Node(node, left, right);
}
function node1(node, tail) {
    return new Node(node, tail, null);
}

function nodeExists(node, tail) {
    for (let n of tail) {
        if (node.id == n.id) {
            return true;
        }
    }
    return false;
}

// Calculates left branch of a repeating node
function left(node, tail) {
    let leftList = [];
    for (let n of tail) {
        if (n.id != node.id) {
            leftList.push(n);
        } else {
            return leftList;
        }
    }
}

// Calculates right branch of a repeating node
function right(node, tail) {
    let isRightSide = false;
    let rightList = [];
    for (let n of tail) {
        if (n.id == node.id) {
            isRightSide = true;
        } else if (!isRightSide) {
            continue;
        } else if (isRightSide) {
            rightList.push(n);
        }
    }
    return rightList;
}
/*
const tree = listToTree([...testList]);
const jsonTree = JSON.stringify(tree, null, 5);

//console.log(util.inspect(new Tree(tree), { depth: null }));
//console.log(jsonTree);

const tree_elm = document.getElementById("treeWindow");
tree_elm = jsonTree;*/

export { listToTree };
