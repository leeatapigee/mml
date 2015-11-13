/*
 * mml - message modification language
 * Provides a simple DSL for manipulating messages and variables as an alternative to
 * ExtractVariable and AssignMessage
 */


// retrieve DSL script from the JavaScript callout policy's script property
var script = properties.script

var vars = {}						// keep track of variables referenced; necessary?

var lines = script.split('\n')		// break the script up into lines

lines.forEach(function(line) {
  line = line.trim()

  // remove comments indicated by # - TODO be smarter about this, in case # needs to be part of the script
  var comment = line.indexOf('#')
  if( comment >= 0 ) {
    print('before removing comment', line)
    line = line.slice(0, comment)
    print('after removing comment', line)
  }

  if( line.trim().length === 0 ) {
    // if line is empty, skip to the next line
  } else {
    var terms = line.split(' ')	// break the line up into terms

    switch( terms[0] ) {
      case 'msg':
      case 'message':
        vars[terms[1]] = new Request()		// create a new request object with the provided name
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
    print('getting value of object', parts)
    var x = vars[parts.msgId]
    value = eval('x.'+imply(parts.msgPart))
  } else {
   	value = context.getVariable(term)
  }

  print('getValue: extracted value of', term, 'is', value)
  return value
}


///////////////////////////////////////////////////////////////////////////////////////
// the AssignMessage portion of the script
function setValue(target, value) {
  print('setValue:', target, value)
  var parts = imply(target)

  if( typeof parts === 'object' ) {
  	print('setting value of object', parts, 'to', value)
    var x = vars[parts.msgId]
    var targ = eval('x.'+imply(parts.msgPart)+'="'+value+'"')
  } else {
  	print('setting value of', target, 'to', value)
  	context.setVariable(target, value)
  }
}

///////////////////////////////////////////////////////////////////////////////////////
// allow for shorthand syntax
function imply(term) {
  var result = term

  print('imply of', term)

  var sections = term.split('.')

  if( sections.length && vars[sections[0]] ) {
    // if the first part of the term is the name of a variable created in this script...
    var theRest = term.slice(sections[0].length+1)		// everything after the name of the message variable and the period
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

  else if( term.indexOf('message:') === 0 || term.indexOf('msg:') === 0 || term.indexOf('m:') === 0 ) {
    var parts = term.split(':')
    if( parts.length > 1 ) {
      var period = parts[1].indexOf('.')
      if( period === -1 ) {
        result = {msgId:parts[1], msgPart:null}
      } else {
        result = {msgId:parts[1].slice(0,period), msgPart:parts[1].slice(period+1)}
      }
    } else {
      print('huh???')
    }
  }

  else {

  }

  print('imply('+term+') became', result)
  return result
}
