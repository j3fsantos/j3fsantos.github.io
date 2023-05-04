import regexp_tree from "regexp-tree";

function processBreakPoints (ast) {
  regexp_tree.traverse(ast, {

    CharacterClass: {
      post({node}) {

        if (node.expressions.length === 1 && node.expressions[0].type === "Char" && node.expressions[0].value === "!") {
          node.type = "UnconditionalBreakPoint";
          node.source = "[!]";
          node.startOffset = node.expressions[0].loc.start.offset - 1;
          node.endOffset = node.expressions[0].loc.end.offset + 1;
        } /*else if(node.expressions.length > 3 && node.expressions.length < 7 && node.expressions[0].type === "Char" && node.expressions[0].value === "!" && node.expressions[1].value === "<" && (node.expressions[3].value === ">" || node.expressions[4].value === ">" || node.expressions[5].value === ">")) {*/ // Possible syntax: [!<,>] = [!<0,0>], [!<x,>], [!<,y>], [!<x,y>]
        else if (node.expressions.length > 3 && node.expressions[0].type === "Char" && node.expressions[0].value === "!" && node.expressions[1].value == '<' && node.expressions[node.expressions.length-1].value == '>') {
          node.type = "ConditionalBreakPoint";
          node.source = node.loc.source;
          node.startOffset = node.expressions[0].loc.start.offset - 1;
          node.endOffset = node.expressions[node.expressions.length - 1].loc.end.offset + 1;

          if(isNaN(parseInt(node.expressions[2].value))) { // [!<,>] and [!<,y>]
            node.minIteration = 0;

            if(isNaN(parseInt(node.expressions[3].value))) { // [!<,>]
              node.maxIteration = 0;
            } else { // [!<,y>]
              // this string concatenation is required for iterations with more than 1 numerical digit (e.g. [!<,100>])
              var iter = '';
              for(let i=3; i<node.expressions.length; i++) {
                if(node.expressions[i].value == '>') break;
                iter += node.expressions[i].value;
              }
              //node.maxIteration = parseInt(node.expressions[3].value);
              node.maxIteration = parseInt(iter);
            }
          } else { // [!<x,>] and [!<x,y>]
            var iter = '';
            var commaIndex = null;
            for(let i=2; i<node.expressions.length; i++) {
              if(node.expressions[i].value == ',') {
                commaIndex = i;
                break;
              }
              iter += node.expressions[i].value;
            }
            //node.minIteration = parseInt(node.expressions[2].value);
            node.minIteration = parseInt(iter);

            if(isNaN(parseInt(node.expressions[commaIndex + 1].value))) { // [!<x,>]
              node.maxIteration = 0;
            } else { // [!<x,y>]
              iter = '';
              for(let i=commaIndex+1; i<node.expressions.length; i++) {
                if(node.expressions[i].value == '>') break;
                iter += node.expressions[i].value;
              }
              //node.maxIteration = parseInt(node.expressions[4].value);
              node.maxIteration = parseInt(iter);
            }
          }
        }
        
      }
    }
  
  });

  return ast.body; 
}

export { processBreakPoints };
