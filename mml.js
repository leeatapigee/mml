/*
 * mml - message modification language
 * Provides a simple DSL for manipulating messages and variables as an alternative to
 * ExtractVariable and AssignMessage
 */


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
  print('setValue:', target, value)
  //var tgt = evaluate(target)
  //var val = evaluate(value)

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

  if( false ) {
    // readability hack to make everything following this begin with an "else"
  }

  else if( term.indexOf('header.') === 0 )
    result = 'message.' + term
  else if( term.indexOf('hdr.') === 0 )
    result = 'message.header.' + term.substr(4)
  else if( term.indexOf('h.') === 0 )
    result = 'message.header.' + term.substr(2)

  else if( term.indexOf('queryparam.') === 0 )
    result = 'message.' + term
  else if( term.indexOf('query.') === 0 )
    result = 'message.queryparam.' + term.substr(6)
  else if( term.indexOf('qp.') === 0 )
    result = 'message.queryparam.' + term.substr(3)
  else if( term.indexOf('q.') === 0 )
    result = 'message.queryparam.' + term.substr(2)

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
