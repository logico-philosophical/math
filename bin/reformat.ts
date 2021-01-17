#!/usr/bin/env node

import unparse from "../src/Unparser";
import fs from 'fs';
import path from 'path';
import pegjs from 'pegjs';

var grammar = fs.readFileSync(path.join(__dirname, '../src/grammar.pegjs'), 'utf-8');
var parser = pegjs.generate(grammar, {cache: true});

var src = path.join(__dirname, '../math');
var dst = path.join(__dirname, '../math-reformatted');

if (!fs.existsSync(dst)) {
	fs.mkdirSync(dst);
}

fs.readdirSync(src).forEach(file => {
	var srcfile = path.join(src, file);
	var code = fs.readFileSync(srcfile, 'utf-8');

	var newcode = unparse(parser.parse(code));
	fs.writeFileSync(path.join(dst, file), newcode);
});