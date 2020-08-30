var Node = require('./Node');
var MetaType = require('./MetaType');

var ExpressionResolver = require('../ExpressionResolver');

function Schema({axiomatic, /* nullable */ name, native, params, expr, doc}, scope, trace) {
	Node.call(this, trace);

	this.doc = doc;

	if (name !== null && typeof name != 'string')
		throw this.error('Assertion failed');

	if (!native && !['type', 'metatype'].includes(expr.type._type)) {
		throw this.error('Assertion failed');
	}

	this.axiomatic = axiomatic;
	this.name = name;

	if (native) {
		this.native = native;
		this.expr = null;
		this.type = null;
	} else {
		if (!(params instanceof Array)
				|| params.map(e => e._type == 'typevar').some(e => !e))
			throw this.error('Assertion failed');

		this.params = params;
		this.expr = expr;
		this.type = new MetaType({
			functional: true,
			from: params.map(typevar => typevar.type),
			to: expr.type
		});
		this.expanded = ExpressionResolver.expandMetaAndFuncalls(expr);
	}
}

Schema.prototype = Object.create(Node.prototype);
Schema.prototype.constructor = Schema;
Schema.prototype._type = 'schema';

Schema.prototype.toString = function () {
	return this.toIndentedString(0);
};

Schema.prototype.toIndentedString = function (indent) {
	if (this.native)
		return `∫ ${this.name} <native>`;

	return [
		`∫ ${this.name || ''}(${this.params.join(', ')}) => {`,
		'\t' + this.expr.toIndentedString(indent + 1),
		'}'
	].join('\n' + '\t'.repeat(indent));
};

Schema.prototype.toTeXString = function (root) {
	if (!this.name) {
		return '\\left('
			+ (
				this.params.length == 1
				? this.params[0].toTeXString()
				: `\\left(${this.params.map(e => e.toTeXString()).join(', ')}\\right)`
			)
			+ `\\mapsto ${this.expr.toTeXString()}\\right)`;
	}

	if (!root)
		return `\\href{#schema-${this.name}}\\mathsf{${this.escapeTeX(this.name)}}`;

	if (this.native)
		return `\\href{#schema-${this.name}}{\\mathsf{${this.escapeTeX(this.name)}}}`
			+ '\\ (\\textrm{native})';

	return `\\href{#schema-${this.name}}{\\mathsf{${this.escapeTeX(this.name)}}}(${this.params.map(e => e.toTeXString()).join(', ')}):`
				+ '\\\\\\quad' + this.expanded.toTeXString();
};

module.exports = Schema;