var grammar;

if (process.env.__webpack__) {
	grammar = require('raw-loader!./grammar.pegjs').default;
} else {
	var fs = require('fs');
	var path = require('path');

	grammar = fs.readFileSync(path.join(__dirname, 'grammar.pegjs'), 'utf-8');
}

var Program = require('./Program').default;

module.exports = {grammar, Program};