import Counter from '../Counter';
import ExecutionContext from '../ExecutionContext';
import { ProofType } from '../ProofType';
import StackTrace from '../StackTrace';
import Expr0 from './Expr0';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import Nameable from './Nameable';
import Node, { Precedence } from './Node';
import ObjectType from './ObjectType';

interface VariableArgumentType {
	doc?: string;
	tex?: string;
	sealed: boolean;
	type: ObjectType;
	name: string;
	expr: Expr0;
}

export default class Variable extends Expr0 implements Nameable {

	public readonly sealed: boolean;
	public readonly type: ObjectType;
	public readonly name: string;
	public readonly expr: Expr0;

	constructor ({doc, tex, sealed, type, name, expr}: VariableArgumentType, trace: StackTrace) {
		super(trace, doc, tex, type);
		
		if (typeof name != 'string')
			throw Node.error('Assertion failed', trace);
		
		if (sealed && !expr) {
			throw Node.error('Cannot seal a primitive fun', trace);
		}

		if (expr && !type.equals(expr.type)) {
			throw Node.error(`Expression type ${expr.type} failed to match the type ${type} of variable ${name}`, trace);
		}

		this.sealed = sealed;
		this.name = name;
		this.expr = expr;
	}

	protected isProvedInternal(hypotheses: Metaexpr[]): boolean {
		return false;
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		if (map.has(this)) return map.get(this);

		// 매크로 변수는 스코프 밖에서 보이지 않으므로 치환될 것을 갖지 않는다는
		// 생각이 들어 있다.
		return this;
	}

	protected expandMetaInternal(andFuncalls: boolean): Metaexpr {
		return this;
	}

	protected getEqualsPriority(context: ExecutionContext): EqualsPriority {
		return this.expr && (!this.sealed || context.canUse(this))
			? EqualsPriority.FOUR
			: EqualsPriority.ZERO;
	}

	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		if (!this.expr) return false;

		if (!this.sealed || context.canUse(this)) {
			return this.expr.equals(obj, context);
		}

		return false;
	}

	protected getProofInternal(
			hypnumMap: Map<Metaexpr, number>,
			$Map: Map<Metaexpr, number | [number, number]>,
			ctr: Counter): ProofType[] {
		
		return [{
			_type: 'NP',
			ctr: ctr.next(),
			expr: this
		}];
	}

	// pr f
	public toSimpleString() {
		return this.type.toSimpleString() + ' ' + this.name;
	}

	public toIndentedString(indent: number, root?: boolean): string {
		return `${root ? this.type + ' ' : ''}${this.name}<${this._id}>`;
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		var id = this instanceof Parameter ? `id-${this._id}` : `def-${this.name}`;

		var tex = this.tex || Node.makeTeXName(this.name);
		
		var expr = root && this.expr
			? `\\coloneqq ${this.expr.toTeXString(Node.PREC_COLONEQQ)}`
			: '';
		
		return `\\href{#${id}}{${tex}}${expr}`;
	}
}

import Parameter from './Parameter';