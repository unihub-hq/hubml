function render_textual(raw_args) { //tangle-style
	let args = normalize_arguments(raw_args);
	let rangeMin = args.range.min;
	let rangeMax = args.range.max;
	let output = `<input type="range" min="${rangeMin}" max="${rangeMax}" step="1" value="5" class="block">`;
	console.log(output);
	return output;
}

function render_block(raw_args) { //slider
	let args = normalize_arguments(raw_args);
	let rangeMin = args.range.min;
	let rangeMax = args.range.max;
	let output = `<input type="range" min="${rangeMin}" max="${rangeMax}" step="1" value="5" class="block">`;
	console.log(output);
	return output;
}

function mastic_unwrapper(value, expected, parameter) {
	if (value.type !== expected) {
		throw `Unexpected type ${value.type} for parameter ${parameter} ; expected ${expected}`;
	}
	return value.value;
}

function normalize_arguments(args) {
	var cleaned = {};
	for (const [key, value] of Object.entries(args)) {
		switch (key) {
			case 'range':
			let cleanVal = mastic_unwrapper(value, 'range', 'range');
			if (!isFinite(cleanVal.min) || !isFinite(cleanVal.max)) {
				throw "The Range component must be given a finite range !";
			}
			cleaned['range'] = cleanVal;
		}
	}
	
	if (!Object.keys(args).includes('range')) {
		throw "The Range component requires a range to be set";
	}
	return cleaned;
}

exports.render_textual = render_textual;
exports.render_block = render_block;