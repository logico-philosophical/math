import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import ObjectExpr from "./ObjectExpr";
import Fun from "./Fun";
import Expr, { EqualsPriority, Precedence } from "./Expr";
import Nameable from "./Nameable";
import Variable from "./Variable";

interface $VariableArgumentType {
	name: string;
	expr: Expr;
}

export default class $Variable extends Expr implements Nameable {

	public readonly name: string;
	public readonly expr: Expr;

	constructor ({name, expr}: $VariableArgumentType, trace: StackTrace) {
		super(null, null, expr.type, trace);

		if (!name || !expr) {
			throw Expr.error('Assertion failed', trace);
		}

		this.name = name;
		this.expr = expr;
	}

	protected isProvedInternal(hypotheses: Expr[]): boolean {
		return this.expr.isProved(hypotheses);
	}

	public substitute(map: Map<Variable, ObjectExpr>): Expr {
		return this.expr.substitute(map);
	}

	protected expandMetaInternal(andFuncalls: boolean): Expr {
		return this.expr.expandMeta(andFuncalls);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.FIVE;
	}

	protected equalsInternal(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false {
		return this.expr.equals(obj, context);
	}

	protected getProofInternal(
			hypnumMap: Map<Expr, number>,
			$Map: Map<Expr, number | [number, number]>,
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
		return `\\mathtt{${Expr.escapeTeX(this.name)}}`;
	}
}