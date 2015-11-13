# MML
Message Manipulation Language


**Usage**

1. Add mml.js to the proxy, environment, or org.
2. Where you want to do the extract and/or assign work, place a JavaScript callout policy.
3. Set the JavaScript ResourceURL to refer to mml.js:
````<ResourceURL>jsc://mml.js</ResourceURL>````

4. Use a Property named script to manipulate messages and variables:
````
    <Properties>
      <Property name="script">
        copy request.verb myverb   # create a flow variable
        copy myverb request.header.abc   # create a header
        copy request.queryparam.x request.header.xquery   # copy a queryparam to a header
      </Property>
</Properties>
````

**Commands**

- **copy src tgt**
- **delete tgt**
- **comments** are initiated by a # at any point in a line

**Syntactic sugar**

- If not specified, message (request or response, depending on the flow) is assumed.
  - header.abc is short for message.header.abc
- Header can be shortened to hdr or h.
  - hdr.abc is the same as message.header.abc
  - h.abc is the same as message.header.abc
- Queryparam can be shortened to query, qp, or q
  - All of these are equivalent
    - message.queryparam.x
    - queryparam.x
    - query.x
    - qp.x
    - q.x

**Issues and enhancements**

- Fix problem with storing message objects created here


- Support for literals
- Support for regex
- Support for form and body/payload variables
- Support for JSONPath
- Support for XPath
- Support for substring extraction with no{yes}no syntax
- Support for handlebars templates
- Externalize scripts (load from resource or URL, not just hardcoded script)
- Potential collision if message object has same name as another variable?
- Accept closures for doing more complex manipulation of parameters
