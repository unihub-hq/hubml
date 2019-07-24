'use strict';

var fs = require('fs');
const JSON6 = require('json6');
const plugins = require('./components/index');
var md = require('markdown-it')({
	html: false,
	linkify: true,
	typographer: true
});
md.use(require('markdown-it-container'), 'warning', {
	validate: function (params) {
		return true;
	},
		render: function (tokens, idx) {
		var m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);
		if (tokens[idx].nesting === 1) {
		      // opening tag
			  return '<div class="alert alert-warning" role="alert">\n';
		} else {
		      // closing tag
		      return '</div>\n';
		}
	},
		marker: "!"
});
md.use(require('markdown-it-container'), 'info', {
	validate: function (params) {
		return true;
	},
		render: function (tokens, idx) {
		var m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);
		if (tokens[idx].nesting === 1) {
		      // opening tag
			  return '<div class="alert alert-info" role="alert">\n';
		} else {
		      // closing tag
		      return '</div>\n';
		}
	},
		marker: ":"
});
md.use(require('markdown-it-container'), 'info', {
	validate: function (params) {
		return true;
	},
		render: function (tokens, idx) {
		var m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);
		if (tokens[idx].nesting === 1) {
		      // opening tag
			  return '<div class="alert alert-success" role="alert">\n';
		} else {
		      // closing tag
		      return '</div>\n';
		}
	},
		marker: "+"
});

function mastic_parse_invocation(raw_invocation, style) {
	var component = raw_invocation.split(/\s(.+)/)[0];  //everything before the first space
	var invocation_string = raw_invocation.split(/\s(.+)/)[1];  //everything after the first space
	invocation_string = "{ " + invocation_string + " }"; // wrap in curly braces for the parser
	var invocation = JSON6.parse(invocation_string); //parse
	  
	let plugin = plugins[component.toLowerCase()];
	if (plugin === undefined) {
		throw `Undefined component : ${component}`;
	}
	
	let callableName = "render_" + style;
	let callable = plugin[callableName];
	if (callable === undefined) {
		throw `The component ${component} is unsupported in ${style} mode`;
	}
	
	let result = callable(invocation);
	return result;
}

var normalizeReference = md.utils.normalizeReference;
var isSpace = md.utils.isSpace;
function mastic_parse_textual(state, silent) {
	var found, label, labelEnd, labelStart, pos, token, invocation, invocationStart, invocationEnd,
		oldPos = state.pos,
		max = state.posMax,
		start = state.pos;
	if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */) {
		return false;
	}
	
	labelStart = state.pos + 1;
	labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, true);
	
	// parser failed to find ']', so it's not a valid link
	if (labelEnd < 0) {
		return false;
	}
	
	label = state.src.slice(labelStart, labelEnd);	
	
	pos = labelEnd + 1;
	
	if (!(pos < max && state.src.charCodeAt(pos) === 0x7B/* { */)) {
		return false;
	}
	invocationStart = pos + 1;
	
	if (state.src.charCodeAt(pos + 1) === 0x7B) {
		return false;
	}
	
	for (; pos < max; pos++) {
		if (state.src.charCodeAt(pos) === 0x7D/* } */) {
			found = true;
			break;
		}
	}
	invocationEnd = pos;
	
	if (!found || start + 1 === pos) {
		state.pos = start;
		return false;
	}
	
	invocation = state.src.slice(invocationStart, invocationEnd);
	pos++;
	
	//
	// We found the end of the link, and know for a fact it's a valid link;
	// so all that's left to do is to call tokenizer.
	//
	if (!silent) {
		state.pos = labelStart;
		state.posMax = labelEnd;
		
		// Earlier we checked !silent, but this implementation does not need it
		token = state.push('mastic_inline_open', 'span', 1);
		token.attrs = [ [ 'class', 'mastic_inline' ] ];
		
		token = state.push('mastic_textual_open', 'span', 1);
		token.attrs = [ [ 'class', 'mastic_textual' ] ];
		state.md.inline.tokenize(state);
		token = state.push('mastic_textual_close', 'span', -1);
		
		token = state.push('html_inline', '', 0);
		token.content = mastic_parse_invocation(invocation, 'textual');
		
		token = state.push('mastic_inline_close', 'span',  -1);
		token.markup = '}';
	}
	
	state.pos = pos;
	state.posMax = max;
	return true;
};

function mastic_parse_inline(state, silent) {
	var found, content, token,
		max = state.posMax,
		start = state.pos;
	if (state.src.charCodeAt(start) !== 0x7B/* { */) {
		return false;
	}
	
	if ((state.src.charCodeAt(start) == 0x7B) && (state.src.charCodeAt(start + 1) == 0x7B)) {
		return false;
	}
	
	if (silent) {
		return false;
	} // don't run any pairs in validation mode
	  if (start + 2 >= max) {
		return false;
	}
	
	state.pos = start + 1;
	while (state.pos < max) {
		if (state.src.charCodeAt(state.pos) === 0x7D/* } */) {
			found = true;
			break;
		}
		
		state.md.inline.skipToken(state);
	}
	
	if (!found || start + 1 === state.pos) {
		state.pos = start;
		return false;
	}
	
	content = state.src.slice(start + 1, state.pos);
	
	// found!
	state.posMax = state.pos;
	state.pos = start + 1;
	
	// Earlier we checked !silent, but this implementation does not need it
	token = state.push('sup_open', 'sup', 1);
	token.markup = '{';
	
	token = state.push('html_inline', '', 0);
	token.content = mastic_parse_invocation(content, 'inline');
	
	token = state.push('sup_close', 'sup',  -1);
	token.markup = '}';
	
	state.pos = state.posMax + 1;
	state.posMax = max;
	
	return true;
}

function mastic_parse_block(state, silent) {
	var found, content, token,
		max = state.posMax,
		start = state.pos;
	if (!((state.src.charCodeAt(start) === 0x7B) && (state.src.charCodeAt(start + 1) === 0x7B))) {
		return false;
	}
	
	if (silent) {
		return false;
	} // don't run any pairs in validation mode
	  if (start + 3 >= max) {
		return false;
	}
	
	state.pos = start + 2;
	while (state.pos < max) {
		if ((state.src.charCodeAt(state.pos) === 0x7D) && (state.src.charCodeAt(state.pos + 1) === 0x7D)) {
			found = true;
			break;
		}
		
		state.md.inline.skipToken(state);
	}
	
	if (!found || start + 2 === state.pos) {
		state.pos = start;
		return false;
	}
	
	content = state.src.slice(start + 2, state.pos);
	
	// found!
	state.posMax = state.pos;
	state.pos = start + 2;
	
	// Earlier we checked !silent, but this implementation does not need it
	token = state.push('sup_open', 'sup', 1);
	token.markup = '{{';
	
	token = state.push('html_block', '', 0);
	token.content = mastic_parse_invocation(content, 'block');
	
	token = state.push('sup_close', 'sup',  -1);
	token.markup = '}}';
	
	state.pos = state.posMax + 2;
	state.posMax = max;
	
	return true;
}

function HubML(options) {
	
}

module.exports = HubML;

md.inline.ruler.after('emphasis', 'mastic_textual', mastic_parse_textual);
md.inline.ruler.after('mastic_textual', 'mastic_block', mastic_parse_block);
md.inline.ruler.after('mastic_block', 'mastic_inline', mastic_parse_inline);
var data = fs.readFileSync(0, 'utf-8');
console.log(md.render(data));

// instantiate parser object (w/ options ? like plugins or stuff + MD options)
// feed it a string
// it outputs HTML + JS

var key = "clé";
var val = "deux";
var obj = {
	key: val,
}

//var result = md.render('# markdown-it rulezz! {Component arg:val}');
//console.log(result);