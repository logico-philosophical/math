/*
 * PEG.js의 출력과 적절한 클래스 사이를 잇는 인터페이스.
 * PEG.js의 출력은 여기에서만 처리해야 한다.
 */

import ExecutionContext from './ExecutionContext';
import $Variable from './exprs/$Variable';
import ObjectExpr from './exprs/ObjectExpr';
import Fun from './exprs/Fun';
import Funcall from './exprs/Funcall';
import Expr from './exprs/Expr';
import ObjectFun from './exprs/ObjectFun';
import Parameter from './exprs/Parameter';
import Reduction from './exprs/Reduction';
import Schema, { SchemaType } from './exprs/Schema';
import Tee from './exprs/Tee';
import { ObjectType, SimpleObjectType } from './exprs/types';
import Variable from './exprs/Variable';
import With from './exprs/With';
import { Def$Object, DefschemaObject, DefunObject, DefvObject, ObjectExprObject, FuncallObject, FunexprObject, ExprObject, ReductionObject, SchemacallObject, SchemaexprObject, StypeObject, TeeObject, TypedefObject, TypeObject, VarObject, WithObject } from './PegInterfaceDefinitions';
import Scope, { NestedTypeInput } from './Scope';

function typeObjToString(obj: TypeObject): string {
	if (obj._type != 'type')
		throw Error('Assertion failed');

	if (!obj.ftype) return (obj as StypeObject).name;
	return '[' + obj.from.map(typeObjToString).join(', ') + ' -> '
			+ typeObjToString(obj.to) + ']';
}

/*
 * Scope#getType이나 Scope#hasType 등의 입력 형태로 바꾼다.
 * st						-> 'st'
 * [cls -> st]				-> ['cls', 'st']
 * [(cls, cls) -> st]		-> ['cls', 'cls', 'st']
 * [[cls -> st] -> st]		-> [['cls', 'st'], 'st']
 */
function typeObjToNestedArr(obj: TypeObject): NestedTypeInput {
	if (obj._type != 'type')
		throw Error('Assertion failed');

	if (!obj.ftype) {
		obj = obj as StypeObject;

		if (!obj.name)
			throw Error('Assertion failed');

		return obj.name;
	} else {
		if (!obj.from || !obj.to)
			throw Error('Assertion failed');

		return obj.from.map(typeObjToNestedArr).concat(
			[typeObjToNestedArr(obj.to)]
		);
	}
}

function varObjToString(obj: VarObject): string {
	switch (obj.type) {
		case '@':
			return `@${obj.name}`;
		case '$':
			return `${obj.name}`;
		case 'normal':
			return `${obj.name}`;
		default:
			throw Error(`Unknown type ${obj.type}`);
	}
}

export default class PI {
	public static type(obj: TypedefObject, parentScope: Scope): ObjectType {
		if (obj._type != 'typedef')
			throw Error('Assertion failed');

		var scope: Scope = parentScope.extend('type', obj.name, obj.location);

		var expr: ObjectType = obj.expr ? scope.getType(typeObjToNestedArr(obj.expr)) : null;

		var name: string = obj.name;
		var doc: string = obj.doc;

		if (expr) {
			return new SimpleObjectType({
				doc,
				name,
				expr
			}, scope.trace);
		}

		return new SimpleObjectType({
			doc,
			name,
			expr: null
		}, scope.trace);
	}

	public static variable(obj: DefvObject | VarObject, parentScope: Scope): Variable | Fun {
		if (!['defv', 'var'].includes(obj._type)) {
			throw Error('Assertion failed');
		}

		var scope = parentScope.extend('variable', obj.name, obj.location);

		if (obj._type == 'var') {
			if (obj.type != 'normal') {
				throw scope.error(`Variable type ${obj.type} not allowed`);
			}

			if (!scope.hasVariable(obj.name))
				throw scope.error(`Undefined identifier ${varObjToString(obj)}`);
			return scope.getVariable(obj.name);
		}

		if (!scope.hasType(typeObjToNestedArr(obj.type)))
			throw scope.error(`Type ${typeObjToString(obj.type)} is not defined`);

		var type = scope.getType(typeObjToNestedArr(obj.type));

		var expr = obj.expr ? PI.objectexpr(obj.expr, scope) : null;

		if (obj.isParam) {
			return new Parameter({
				doc: obj.doc,
				tex: obj.tex,
				type,
				name: obj.name,
				selector: obj.selector || null
			}, scope.trace);
		}

		return new Variable({
			doc: obj.doc,
			tex: obj.tex,
			sealed: !!obj.sealed,
			type,
			name: obj.name,
			expr: expr || null
		}, scope.trace);
	}

	public static fun(obj: DefunObject | FunexprObject, parentScope: Scope): ObjectFun {
		if (obj._type != 'defun' && obj._type != 'funexpr')
			throw Error('Assertion failed');
		
		var scope = parentScope.extend('fun', obj._type == 'defun' ? obj.name : '<anonymous>', obj.location);

		var doc = null,
			tex = null,
			sealed = false,
			rettype: ObjectType = null,
			name = null,
			expr = null;

		if (obj._type == 'defun') {
			doc = obj.doc;
			tex = obj.tex;
			sealed = obj.sealed;
			
			if (!scope.hasType(typeObjToNestedArr(obj.rettype))) {
				throw scope.error(`Type ${typeObjToString(obj.rettype)} is not defined`);
			}

			rettype = scope.getType(typeObjToNestedArr(obj.rettype));
			name = obj.name;
		}

		var params = obj.params.map(tvo => {
			var tv = PI.variable(tvo, scope);

			if (scope.hasOwnVariable(tv.name))
				throw scope.error(`Parameter ${tv.name} has already been declared`);
			
			if (!(tv instanceof Parameter)) {
				throw Error('Something\'s wrong');
			}

			scope.addVariable(tv);
			return tv;
		});

		if (obj.expr) {
			expr = PI.objectexpr(obj.expr, scope);
		}

		return new ObjectFun({annotations: [], sealed, rettype, name, params, expr, doc, tex}, scope.trace);
	}

	public static funcall(obj: FuncallObject, parentScope: Scope): Funcall {
		if (obj._type != 'funcall')
			throw Error('Assertion failed');

		var scope = parentScope.extend('funcall', 'name' in obj.schema ? obj.schema.name : null, obj.location);

		var fun = PI.objectexpr(obj.schema, scope);

		var args = obj.args.map(arg => {
			return PI.objectexpr(arg, scope);
		});

		return new Funcall({fun, args}, scope.trace);
	}

	public static expr(obj: ExprObject, parentScope: Scope, context: ExecutionContext): Expr {
		if (!['tee', 'reduction', 'schemacall', 'schemaexpr', 'var', 'with'].includes(obj._type)) {
			throw Error('Assertion failed');
		}

		// don't extend scope
		var scope = parentScope;

		switch (obj._type) {
			case 'tee':
				return PI.tee(obj, scope, context);
			case 'reduction':
				return PI.reduction(obj, scope, context);
			case 'schemacall':
				return PI.schemacall(obj, scope, context);
			case 'schemaexpr':
				return PI.schema(obj, scope, context);
			case 'var':
				return PI.metavar(obj, scope);
			case 'with':
				return PI.with(obj, scope, context);
			default:
				throw Error('wut');
		}
	}

	public static objectexpr(obj: ObjectExprObject, parentScope: Scope): ObjectExpr {
		if (!['funcall', 'funexpr', 'var'].includes(obj._type)) {
			console.log(obj);
			throw Error('Assertion failed');
		}

		// don't extend scope
		var scope = parentScope;

		switch (obj._type) {
			case 'funcall':
				return PI.funcall(obj, scope);
			case 'funexpr':
				return PI.fun(obj, scope);
			case 'var':
				return PI.variable(obj, scope);
			default:
				throw Error('wut');
		}
	}

	public static metavar(obj: VarObject, parentScope: Scope): Expr {
		if (obj._type != 'var')
			throw Error('Assertion failed');

		// don't extend scope
		var scope = parentScope;

		switch (obj.type) {
			case '@':
				if (obj.name.match(/^h[0-9]+$/)) {
					var hypnum = Number(obj.name.slice(1)) - 1;
					if (hypnum >= scope.hypotheses.length) {
						throw scope.error(`Hypothesis #${hypnum + 1} not found`);
					}

					return scope.hypotheses[hypnum];
				}

				throw scope.error(`Unknown selector query ${varObjToString(obj)}`);
			case '$':
				if (!scope.has$(obj.name)) {
					throw scope.error(`${varObjToString(obj)} is not defined`);
				}

				return scope.get$(obj.name);
			case 'normal':
				if (!scope.hasSchema(obj.name))
					throw scope.error(`Schema ${varObjToString(obj)} is not defined`);

				return scope.getSchema(obj.name);
			default:
				throw scope.error(`Unknown type ${obj.type}`);
		}
	}

	public static with(obj: WithObject, parentScope: Scope, context: ExecutionContext): With {
		if (obj._type != 'with') {
			throw Error('Assertion failed');
		}

		var scope = parentScope.extend('with', null, obj.location);

		var tv = PI.variable(obj.with, scope);

		if (scope.hasOwnVariable(tv.name))
			throw scope.error(`Parameter ${tv.name} has already been declared`);
		
		if (!(tv instanceof Variable)) {
			throw Error('Something\'s wrong');
		}

		scope.addVariable(tv);

		var def$s = obj.def$s.map($ => {
			var $v = PI.def$($, scope, context);

			if (scope.hasOwn$($v.name)) {
				throw scope.error(`${$.name} has already been declared`);
			}

			return scope.add$($v);
		});

		var expr = PI.expr(obj.expr, scope, context);

		return new With({
			variable: tv,
			def$s,
			expr
		}, scope.trace);
	}

	public static tee(obj: TeeObject, parentScope: Scope, context: ExecutionContext): Tee {
		if (obj._type != 'tee')
			throw Error('Assertion failed');

		var scope = parentScope.extend('tee', null, obj.location);

		var left = obj.left.map(o => PI.expr(o, scope, context));

		var scopeRight = scope.extend('tee.right', null, obj.right.location);
		left.forEach(l => scopeRight.hypotheses.push(l));

		var def$s = obj.def$s.map($ => {
			var $v = PI.def$($, scopeRight, context);

			if (scopeRight.hasOwn$($v.name)) {
				throw scopeRight.error(`${$.name} has already been declared`);
			}

			return scopeRight.add$($v);
		});

		var right = PI.expr(obj.right, scopeRight, context);

		return new Tee({left, def$s, right}, scope.trace);
	}

	public static def$(obj: Def$Object, parentScope: Scope, context: ExecutionContext): $Variable {
		if (obj._type != 'def$')
			throw Error('Assertion failed');
		
		var scope = parentScope.extend('def$', obj.name, obj.location);
		
		var expr = PI.expr(obj.expr, scope, context);

		return new $Variable({name: obj.name, expr}, scope.trace);
	}

	public static schema(obj: DefschemaObject | SchemaexprObject, parentScope: Scope, oldContext: ExecutionContext): Schema {
		if (obj._type != 'defschema' && obj._type != 'schemaexpr')
			throw Error('Assertion failed');
		
		var name = obj._type == 'defschema' ? obj.name : null;

		var scope = parentScope.extend('schema', name, obj.location);

		var schemaType: SchemaType = 'schema',
			doc: string = null,
			annotations: string[] = [],
			context = oldContext;

		if (obj._type == 'defschema') {
			schemaType = obj.schemaType;
			doc = obj.doc;
			annotations = obj.annotations;

			if (oldContext) {
				console.log(oldContext);
				throw Error('duh');
			}

			var using: (Variable | ObjectFun)[] = obj.using.map(name => {
				if (!scope.hasVariable(name)) {
					throw scope.error(`Variable ${name} is not defined`);
				}

				var fun = scope.getVariable(name);

				if (!fun.expr) {
					throw scope.error(`${name} is not a macro`);
				}

				return fun;
			});

			context = new ExecutionContext(using);
		}

		var params = obj.params.map(tvo => {
			var tv = PI.variable(tvo, scope);

			if (scope.hasOwnVariable(tv.name))
				throw scope.error(`Parameter ${tv.name} has already been declared`);
			
			if (!(tv instanceof Parameter)) {
				throw Error('Something\'s wrong');
			}

			scope.addVariable(tv);
			return tv;
		});

		var def$s = obj.def$s.map($ => {
			var $v = PI.def$($, scope, context);

			if (scope.hasOwn$($v.name)) {
				throw scope.error(`${$.name} has already been declared`);
			}

			return scope.add$($v);
		});

		var expr = PI.expr(obj.expr, scope, context);

		return new Schema({doc, tex: null, annotations, schemaType, name, params, context, def$s, expr}, scope.trace);
	}

	public static schemacall(obj: SchemacallObject, parentScope: Scope, context: ExecutionContext): Funcall {
		if (obj._type != 'schemacall')
			throw Error('Assertion failed');

		var scope = parentScope.extend('schemacall', 'name' in obj.schema ? obj.schema.name : null, obj.location);

		var fun = PI.expr(obj.schema, scope, context);

		var args = obj.args.map(obj => {
			return PI.objectexpr(obj, scope);
		});

		return new Funcall({
			fun,
			args
		}, scope.trace);
	}

	public static reduction(obj: ReductionObject, parentScope: Scope, context: ExecutionContext): Reduction {
		if (obj._type != 'reduction')
			throw Error('Assertion failed');
		
		if (!context) {
			throw Error('duh');
		}

		var scope = parentScope.extend('reduction', 'name' in obj.subject ? obj.subject.name : null, obj.location);

		var subject = PI.expr(obj.subject, scope, context);

		var args = !obj.args
			? null
			: obj.args.map(g => {
				return g && PI.objectexpr(g, scope);
			});

		var antecedents = obj.antecedents.map(obj => {
			return PI.expr(obj, scope, context);
		});

		var as = obj.as && PI.expr(obj.as, scope, context);

		return new Reduction({
			subject,
			args,
			antecedents,
			as
		}, context, scope.trace);
	}
}