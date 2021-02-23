import foo, { EvalParserType, ParserType } from "./Program";

var parser: ParserType, evalParser: EvalParserType;

if (process.env.__webpack__) {
	parser = require('../dist/parser');
	evalParser = require('../dist/evalParser');
} else {
	let fs = require('fs');
	let path = require('path');
	let pegjs = require('pegjs');

	let grammar = fs.readFileSync(path.join(__dirname, 'grammar.pegjs'), 'utf-8');
	parser = pegjs.generate(grammar, {cache: true});
	evalParser = pegjs.generate(grammar, {cache: true, allowedStartRules: ['evaluable']});
}

var Program = foo(parser, evalParser);

export default {parser, evalParser, Program};