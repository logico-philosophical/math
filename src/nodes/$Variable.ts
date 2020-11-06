import ExecutionContext from "../ExecutionContext";
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
		return EqualsPriority.FOUR;
	}

	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		return this.expr.equals(obj, context);
	}

	public toIndentedString(indent: number, root?: boolean): string {
		return this.name;
	}
	
	public toTeXString(prec?: Precedence, root?: boolean): string {
		return `\\mathtt{${Node.escapeTeX(this.name)}}`;
	}
}