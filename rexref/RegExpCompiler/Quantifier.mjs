function evaluateQuantifier (q) { 
    if (!q) throw ("Crazy q: " + q); 
    switch (q.kind) {
      case "*"     : return { min: 0, max: Infinity, greedy: q.greedy }; 
      case "+"     : return { min: 1, max: Infinity, greedy: q.greedy }; 
      case "?"     : return { min: 0, max: 1,        greedy: q.greedy }; 
      case "Range" :
        var min = q.from;
        var max = q.to || Infinity;
        return { min, max, greedy: q.greedy };
      default      : throw new Errror("Quantifier not supported: " + q.kind)
    }
  }

function min (q) { return q.min; }

function max (q) { return q.max; }

function greedy (q) { return q.greedy; }

export { evaluateQuantifier, max, min, greedy };
