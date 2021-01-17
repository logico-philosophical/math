import chai, { expect } from "chai";
import ExecutionContext from "../src/ExecutionContext";
chai.use(require('chai-as-promised'));
import Metaexpr from "../src/nodes/Metaexpr";
import ObjectFun from "../src/nodes/ObjectFun";
import Program from "../src/Program";
var pegjs = require('pegjs');
var fs = require('fs');
var path = require('path');

var grammar = fs.readFileSync(path.join(__dirname, '../src/grammar.pegjs'), 'utf-8');
var parser = pegjs.generate(grammar, {cache: true});
var evalParser = pegjs.generate(grammar, {cache: true, allowedStartRules: ['evaluable']});

import unparse from '../src/Unparser';

function removeLocationify(obj) {
	return JSON.stringify(obj, (k, v) => {
		if (k == 'location') return undefined;
		return v;
	}, 2);
}

describe('Unparser', function () {
	var program = new Program(parser);

	[
		'propositional', 'predicate', 'set',
		'relation', 'function', 'natural',
		'algebra', 'integer'
	].forEach(name => {
		it(`can unparse ${name}.math`, async function () {
            var o = fs.readFileSync(path.join(__dirname, '../math/' + name + '.math'), 'utf-8');
			var parsed = parser.parse(o);
			var parsed_unparsed_parsed = parser.parse(unparse(parsed));
			
			expect(removeLocationify(parsed) == removeLocationify(parsed_unparsed_parsed)).to.be.true;
		});
	});
});

describe('Program', function () {
	var program = new Program(parser);

	[
		'propositional', 'predicate', 'set',
		'relation', 'function', 'natural',
		'algebra', 'integer'
	].forEach(name => {
		it(`can load ${name}.math`, async function () {
			await program.loadModule(name, (filename: string) => ({
                fileUri: filename + '.math',
				code: fs.readFileSync(path.join(__dirname, '../math/' + filename + '.math'), 'utf-8')
			}));
		});
	});
});

describe('ObjectFun', function () {
	it('should throw if !rettype && !expr', function () {
		expect(() => new ObjectFun({
			doc: null,
			tex: null,
			annotations: [],
			sealed: false,
			rettype: null,
			name: null,
			params: [],
			expr: null
		}, null)).to.throw();
	});
});

describe('Issue #52', function () {
	it('(f(x))(y) == (f(x))(y)', async function () {
		var program = new Program(parser);

		await program.loadModule('duh', (_filename: string) => ({
			code: `
type cls;

[cls -> [cls -> cls]] f;
cls x;
cls y;
`
		}));
		var foo = program.evaluate(evalParser.parse(`(f(x))(y)`)) as Metaexpr,
			baz = program.evaluate(evalParser.parse(`(f(x))(y)`)) as Metaexpr;
		
		expect(foo.equals(baz, null)).to.be.true;
	});
});

describe('Sealed macro & using', function () {
	it('N(p) != (sealed p => N(p))', async function () {
		var program = new Program(parser);
		
		await program.loadModule('duh', (_filename: string) => ({
			code: `
type st;

st p;

st N(st p);

sealed st N2(st p) {
	N(p)
}
`
		}));
		var foo = program.evaluate(evalParser.parse(`N(p)`)) as Metaexpr,
			baz = program.evaluate(evalParser.parse(`N2(p)`)) as Metaexpr;
		
		expect(foo.equals(baz, new ExecutionContext())).to.be.false;
	});

	for (let i = 0; i < 2; i++) {
		it(`Issue #53.${i + 1}`, async function () {
			var program = new Program(parser);
			
			await expect(program.loadModule('duh', (_filename: string) => ({
				code: `
type st;
st p;
st N(st p);

sealed st N2(st p) {
	N(p)
}

schema foo(st p) using N2 {
	N2(p) |- p
}

schema bar(st p) ${i == 0 ? '' : 'using N2'} {
	N(p) |- {
        @h1 > foo(p)
    }
}
`
			}))).to.be[i == 0 ? 'rejected' : 'fulfilled'];
		});
	}
});