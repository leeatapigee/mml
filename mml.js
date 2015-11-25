/*
 * mml - message modification language
 * Provides a simple DSL for manipulating messages and variables as an alternative to
 * ExtractVariable and AssignMessage
 */

var msgs = []                     // track created message objects

// retrieve DSL script from the JavaScript callout policy's script property
var script = properties.script
var lines = script.split('\n')		// break the script up into lines

// interpret each line of script
lines.forEach(function(line) {
  line = line.trim()

  // remove comments indicated by # - TODO be smarter about this, in case # needs to be part of the script
  var comment = line.indexOf('#')
  if( comment >= 0 ) {
    line = line.slice(0, comment).trim()
  }

  if( line.length !== 0 ) {
    var terms = line.split(' ')	// break the line up into terms

    // extract code, if present
    if( line.indexOf('function:') >=0 || line.indexOf('code:') >= 0 ) {
      // TODO this quick hack will fail if the the other terms appear within the code block
      // reparse to isolate code
      var code = line.replace(terms[0], '').replace(terms[terms.length-1], '').trim()
      print('isolated code', code)
      line = code
      terms[1] = code
      terms[2] = terms[terms.length-1]
    }

    switch( terms[0] ) {
      case 'msg':
      case 'message':
        // TODO not sure how to create a new Message object in JavaScript, so the
        // TODO current implementation makes a copy of the current message object
        context.setVariable(terms[1], context.getVariable('message'))
        msgs.push(terms[1])
        break

      case 'copy':
        try {
          setValue(terms[2], getValue(terms[1]))
        } catch(e) {
          print(line, 'caused error', e)
        }
        print('')
        break

      case 'delete':
        context.removeVariable(evaluate(terms[1]))
        break
        
      case 'jsonpath':
      case 'jpath':
      case 'jp':
        // TODO ugly syntax - how to improve it?
        var input = JSON.parse(context.getVariable(terms[1]).content)   // retrieve the body of the specified message
        var output = terms[terms.length-1]
        var expr = line.replace(terms[0], '').replace(terms[1], '').replace(output, '').trim()
        expr = expr.slice(1, expr.length-1)     // remove quotes
        var result = jsonPath(input, expr)
        // TODO result might be an array of objects - how to refine selection?
        print('result', result)
        context.setVariable(output, result[0])
        break

      default:
        print('syntax error:', line)
        print('')
        break
    }
  }
})


///////////////////////////////////////////////////////////////////////////////////////
// the ExtractVariable portion of the script
function getValue(term) {
  print('getValue:', term)
  var parts = evaluate(term)
  var value

  if( typeof parts === 'object' ) {
    value = parts.value
  } else {
    value = context.getVariable(parts)
  }
  print('getValue: extracted value of', term, 'is', value)
  return value
}


///////////////////////////////////////////////////////////////////////////////////////
// the AssignMessage portion of the script
// sets target to value
function setValue(target, value) {
  target = evaluate(target)
  print('setValue:', target, value)

  // target and value are both "scalars"
	print('setting value of', target, 'to', value)
	context.setVariable(target, value)
}

///////////////////////////////////////////////////////////////////////////////////////
// allow for shorthand syntax
function evaluate(term) {
  var result = term

  print('evaluating', term)

  var sections = term.split('.')

  // literal
  if( (term[0] === '"' && term[term.length-1] === '"') ||
      (term[0] === "'" && term[term.length-1] === "'") ) {
    var literal = term.slice(1, term.length-1)         // get rid of the quotes
    print('literal', literal)
    result = {value:literal}
  }

  // reference to a new message object
  else if( sections.length && msgs.indexOf(sections[0]) > -1 ) {
    // if the term refers to a message variable created in this script...
    var theRest = term.slice(sections[0].length+1)	  // everything after the name of the message variable and the period
    var msgPart = evaluate(theRest)                   // run through evaluate with the message part string
    result = msgPart.replace(/^message/, sections[0]) // after expansion, reinsert the name of the correct message
  }

  // shorthand notation for headers
  else if( term.indexOf('header.') === 0 )
    result = 'message.' + term
  else if( term.indexOf('hdr.') === 0 )
    result = 'message.header.' + term.substr(4)
  else if( term.indexOf('h.') === 0 )
    result = 'message.header.' + term.substr(2)

  // shorthand notation for queryparams
  else if( term.indexOf('queryparam.') === 0 )
    result = 'message.' + term
  else if( term.indexOf('query.') === 0 )
    result = 'message.queryparam.' + term.substr(6)
  else if( term.indexOf('qp.') === 0 )
    result = 'message.queryparam.' + term.substr(3)
  else if( term.indexOf('q.') === 0 )
    result = 'message.queryparam.' + term.substr(2)

  // code snippet
  else if( term.indexOf('function:') === 0 || term.indexOf('code:') === 0 ) {
    var colon = term.indexOf(':')
    var code = term.slice(colon+1)
    print('evaluating code', code)
    result = {value:eval(code)}
  }

  else {
    // any default processing needed here?
  }

  print('evaluate('+term+') became', result)
  return result
}



/* JSONPath 0.8.0 - XPath for JSON
 *
 * Copyright (c) 2007 Stefan Goessner (goessner.net)
 * Licensed under the MIT (MIT-LICENSE.txt) licence.
 */
function jsonPath(obj, expr, arg) {
   var P = {
      resultType: arg && arg.resultType || "VALUE",
      result: [],
      normalize: function(expr) {
         var subx = [];
         return expr.replace(/[\['](\??\(.*?\))[\]']/g, function($0,$1){return "[#"+(subx.push($1)-1)+"]";})
                    .replace(/'?\.'?|\['?/g, ";")
                    .replace(/;;;|;;/g, ";..;")
                    .replace(/;$|'?\]|'$/g, "")
                    .replace(/#([0-9]+)/g, function($0,$1){return subx[$1];});
      },
      asPath: function(path) {
         var x = path.split(";"), p = "$";
         for (var i=1,n=x.length; i<n; i++)
            p += /^[0-9*]+$/.test(x[i]) ? ("["+x[i]+"]") : ("['"+x[i]+"']");
         return p;
      },
      store: function(p, v) {
         if (p) P.result[P.result.length] = P.resultType == "PATH" ? P.asPath(p) : v;
         return !!p;
      },
      trace: function(expr, val, path) {
         if (expr) {
            var x = expr.split(";"), loc = x.shift();
            x = x.join(";");
            if (val && val.hasOwnProperty(loc))
               P.trace(x, val[loc], path + ";" + loc);
            else if (loc === "*")
               P.walk(loc, x, val, path, function(m,l,x,v,p) { P.trace(m+";"+x,v,p); });
            else if (loc === "..") {
               P.trace(x, val, path);
               P.walk(loc, x, val, path, function(m,l,x,v,p) { typeof v[m] === "object" && P.trace("..;"+x,v[m],p+";"+m); });
            }
            else if (/,/.test(loc)) { // [name1,name2,...]
               for (var s=loc.split(/'?,'?/),i=0,n=s.length; i<n; i++)
                  P.trace(s[i]+";"+x, val, path);
            }
            else if (/^\(.*?\)$/.test(loc)) // [(expr)]
               P.trace(P.eval(loc, val, path.substr(path.lastIndexOf(";")+1))+";"+x, val, path);
            else if (/^\?\(.*?\)$/.test(loc)) // [?(expr)]
               P.walk(loc, x, val, path, function(m,l,x,v,p) { if (P.eval(l.replace(/^\?\((.*?)\)$/,"$1"),v[m],m)) P.trace(m+";"+x,v,p); });
            else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) // [start:end:step]  phyton slice syntax
               P.slice(loc, x, val, path);
         }
         else
            P.store(path, val);
      },
      walk: function(loc, expr, val, path, f) {
         if (val instanceof Array) {
            for (var i=0,n=val.length; i<n; i++)
               if (i in val)
                  f(i,loc,expr,val,path);
         }
         else if (typeof val === "object") {
            for (var m in val)
               if (val.hasOwnProperty(m))
                  f(m,loc,expr,val,path);
         }
      },
      slice: function(loc, expr, val, path) {
         if (val instanceof Array) {
            var len=val.length, start=0, end=len, step=1;
            loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g, function($0,$1,$2,$3){start=parseInt($1||start);end=parseInt($2||end);step=parseInt($3||step);});
            start = (start < 0) ? Math.max(0,start+len) : Math.min(len,start);
            end   = (end < 0)   ? Math.max(0,end+len)   : Math.min(len,end);
            for (var i=start; i<end; i+=step)
               P.trace(i+";"+expr, val, path);
         }
      },
      eval: function(x, _v, _vname) {
         try { return $ && _v && eval(x.replace(/@/g, "_v")); }
         catch(e) { throw new SyntaxError("jsonPath: " + e.message + ": " + x.replace(/@/g, "_v").replace(/\^/g, "_a")); }
      }
   };

   var $ = obj;
   if (expr && obj && (P.resultType == "VALUE" || P.resultType == "PATH")) {
      P.trace(P.normalize(expr).replace(/^\$;/,""), obj, "$");
      return P.result.length ? P.result : false;
   }
} 
