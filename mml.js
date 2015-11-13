/*
 * mml - message modification language
 * Provides a simple DSL for manipulating messages and variables as an alternative to
 * ExtractVariable and AssignMessage
 */


// retrieve DSL script from the JavaScript callout policy's script property
var script = properties.script

var vars = {}						// keep track of variables
//vars['message'] = context.getMessage('message.content')   // preload current message into vars

var lines = script.split('\n')		// break the script up into lines

lines.forEach(function(line) {
  line = line.trim()

  // remove comments indicated by # - TODO be smarter about this, in case # needs to be part of the script
  var comment = line.indexOf('#')
  if( comment >= 0 ) {
    line = line.slice(0, comment)
  }

  if( line.trim().length !== 0 ) {
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
        //vars[terms[1]] = new Request()		// create a new request object with the provided name
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
        // TODO need to handle msg:header.xyz syntax
        context.removeVariable(imply(terms[1]))
        break

      default:
        print('syntax error:', line)
        print('')
        break
    }
  }
})

// to finalize, write all created variables to the context
for (var v in vars) {
  if (vars.hasOwnProperty(v)) {
    print('wrap up',v,'=',vars[v])
    context.setVariable(v, vars[v])		// TODO this is not saving a usable request object
  }
}


///////////////////////////////////////////////////////////////////////////////////////
// the ExtractVariable portion of the script
function getValue(term) {
  print('getValue:', term)
  var parts = imply(term)
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
  //var tgt = imply(target)
  //var val = imply(value)

  // target and value are both "scalars"
	print('setting value of', target, 'to', value)
	context.setVariable(target, value)
}

///////////////////////////////////////////////////////////////////////////////////////
// allow for shorthand syntax
function imply(term) {
  var result = term

  print('imply of', term)

  var sections = term.split('.')

  if( sections.length && vars[sections[0]] ) {
    // we should currently never enter this section, because vars should be empty
    // if the first part of the term is the name of a variable created in this script...
    var theRest = term.slice(sections[0].length+1)		// everything following the name of the message variable and the period
    result = {msgId:sections[0], msgPart:theRest}		// this is how a part of a created message object is returned to the caller
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

  }

  print('imply('+term+') became', result)
  return result
}
