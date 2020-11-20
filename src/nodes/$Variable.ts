import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import Expr0 from "./Expr0";
import Metaexpr, { EqualsPriority } from "./Metaexpr";
import Nameable from "./Nameable";
import Node, { Precedence } from "./Node";
import Variable from "./Variable";

interface $VariableArgumentType {
	name: string;
	expr: Metaexpr;
}

export default class $Variable extends Metaexpr implements Nameable {

	public readonly name: string;
	public readonly expr: Metaexpr;

	constructor ({name, expr}: $VariableArgumentType, trace: StackTrace) {
		super(trace, null, null, expr.type);

		if (!name || !expr) {
			throw Node.error('Assertion failed', trace);
		}

		this.name = name;
		this.expr = expr;
	}

	public isProved(hyps?): boolean {
		hyps = hyps || [];
		
		return super.isProved(hyps)
			|| this.expr.isProved(hyps);
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		return this.expr.substitute(map);
	}

	protected expandMetaInternal(andFuncalls: boolean): Metaexpr {
		return this.expr.expandMeta(andFuncalls);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.FIVE;
	}

	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		return this.expr.equals(obj, context);
	}

	protected getProofInternal(
			hypnumMap: Map<Metaexpr, number>,
			$Map: Map<Metaexpr, number | [number, number]>,
			ctr: Counter): ProofType[] {
		
		if (!$Map.has(this)) {
			throw Error(`${this.name} is not defined`);
		}

		return [{
			_type: 'R',
			ctr: ctr.next(),
			num: $Map.get(this),
			expr: this.expr
		}];
	}

	public toIndentedString(indent: number, root?: boolean): string {
		return this.name;
	}
	
	public toTeXString(prec?: Precedence, root?: boolean): string {
		return `\\mathtt{${Node.escapeTeX(this.name)}}`;
	}
}