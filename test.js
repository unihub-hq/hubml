const fs = require('fs');
const { equal, assert } = require('assert')
const hubml = require('./index')()

const block_test = `:::
info block
:::
!!!
warning block
!!!
+++
highlighted/success block
+++
`

equal(hubml.render(block_test),
  `<div class="alert alert-success" role="alert">
<p>info block</p>
</div>
<div class="alert alert-warning" role="alert">
<p>warning block</p>
</div>
<div class="alert alert-success" role="alert">
<p>highlighted/success block</p>
</div>
`)


const math_inline_test = '$\\LaTeX$'
equal(hubml.render(math_inline_test).startsWith('<p><eq><span class="katex">'), true)

const math_block_test = `$$
% \\f is defined as f(#1) using the macro
\\f{x} = \\int_{-\\infty}^\\infty
    \\hat \\f\\xi\\,e^{2 \\pi i \\xi x}
    \\,d\\xi
$$
`
equal(hubml.render(math_block_test).startsWith('<section><eqn><span class="katex-display"><span class="katex">'), true)

const custom_heading_id = `#(custom-id) Heading
Text
##(another-id !notoc) Another title
Some text
##(!notoc) Subtitle
Blah
## Last title
Bye.
`
equal(hubml.render(custom_heading_id), '<h1 id="user-content-custom-id">Heading</h1>\n<p>Text</p>\n<h2 id="user-content-custom-id/another-id">Another title</h2>\n<p>Some text</p>\n<h2 id="user-content-custom-id/subtitle">Subtitle</h2>\n<p>Blah</p>\n<h2 id="user-content-custom-id/last-title">Last title</h2>\n<p>Bye.</p>\n')
equal(hubml.toc, '<nav class="table-of-contents"><ol><li><a href="#user-content-custom-id">Heading</a><ol><li><a href="#user-content-custom-id/last-title">Last title</a></li></ol></li></ol></nav>')


// console.log(hubml.render(math_block_test))

// instantiate parser object (w/ options ? like plugins or stuff + MD options)
// feed it a string
// it outputs HTML + JS
