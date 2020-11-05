import Expr0 from './Expr0';
import Nameable from './Nameable';

export default abstract class Fun extends Expr0 implements Nameable {

	public readonly annotations: string[];
	public readonly sealed: boolean;
	public readonly name: string;
	public readonly params: Variable[];
	public readonly expr: Metaexpr;

	/*
	 * name, expr 중 하나 이상 있어야 하고 type, expr 중
	 * 한 개만 있어야 한다.
	 */
	constructor ({doc, tex, annotations, sealed, type, name, params, expr}: FunArgumentType, trace: StackTrace) {
		if (!name && !expr)
			throw Node.error('Anonymous fun cannot be primitive', trace);

		if (type && expr)
			throw Node.error('no', trace);

		if (!type && !expr)
			throw Node.error('Cannot guess the type of a primitive fun', trace);
		
		var precedence = false;

		if (tex) {
			var parsed = Node.parseTeX(tex);
			precedence = parsed.precedence;
			tex = parsed.code;
		} else {
			tex = null;
		}
		
		super(
			trace, doc, tex,
			type || new (expr.type instanceof ObjectType ? ObjectType : MetaType)({
				functional: true,
				from: params.map(variable => variable.type),
				to: expr.type as any
			})
		);

		this.annotations = annotations;
		this.sealed = sealed;
		this.precedence = precedence;
		this.name = name;
		this.params = params;
		this.expr = expr;
	}

	public isProved(hyps?) {
		hyps = hyps || [];
		
		return super.isProved(hyps)
			|| this.expr && this.expr.isProved(hyps);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.ONE;
	}
	
	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		if (!(this.expr && !this.sealed)
				&& !(obj instanceof Fun && obj.expr && !obj.sealed)) {
			return false;
		}

		var placeholders = [];
		var types = (this.type.resolve() as ObjectType | MetaType).from;

		for (var i = 0; i < types.length; i++) {
			placeholders.push(new Variable({
				isParam: true,
				type: types[i],
				name: '$' + i
			}, this.trace));
		}

		var thisCall = this.expr && !this.sealed
			? this.call(placeholders)
			: new Funcall({
				fun: this,
				args: placeholders
			}, this.trace);

		var objCall = obj instanceof Fun && obj.expr && !obj.sealed
			? obj.call(placeholders)
			: new Funcall({
				fun: obj,
				args: placeholders
			}, this.trace);
		
		return thisCall.equals(objCall, context);
	}

	public abstract isCallable(context: ExecutionContext): boolean;

	public call(args: Expr0[]): Metaexpr {
		if (!this.expr) {
			throw Error('Cannot call a primitive fun');
		}

		if (this.params.length != args.length) {
			throw Error('Illegal arguments length');
		}

		var map: Map<Variable, Expr0> = new Map();

		for (var i = 0; i < this.params.length; i++) {
			map.set(this.params[i], args[i]);
		}

		return this.expr.substitute(map);
	}
}

import Funcall from './Funcall';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import Node from './Node';
import ObjectType from './ObjectType';
import Type from './Type';
import Variable from './Variable';
import StackTrace from '../StackTrace';
import ExecutionContext from '../ExecutionContext';

interface FunArgumentType {
	doc?: string;
	tex?: string;
	annotations: string[];
	sealed: boolean;
	type?: Type;
	name?: string;
	params: Variable[];
	expr?: Metaexpr;
}