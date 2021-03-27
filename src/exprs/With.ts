import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import $Variable from "./$Variable";
import Fun from "./Fun";
import Expr, { EqualsPriority, Precedence } from "./Expr";
import Variable from "./Variable";

interface WithArgumentType {
	variable: Variable;
	def$s: $Variable[];
	expr: Expr;
}

export default class With extends Expr {

	public readonly variable: Variable;
	public readonly def$s: $Variable[];
	public readonly expr: Expr;

	constructor({variable, def$s, expr}: WithArgumentType, trace: StackTrace) {
		super(null, false, null, expr.type, trace);

		this.variable = variable;
		this.def$s = def$s;
		this.expr = expr;
	}

	public substitute(map: Map<Variable, Expr>): Expr {
		if (map.has(this.variable))
			throw Error('Parameter collision');

		return this.expand().substitute(map);
	}

	protected expandInternal(): Expr {
		var map = new Map<Variable, Expr>();
		map.set(this.variable, this.variable.expr);

		return this.expr.substitute(map).expand();
	}

	protected getEqualsPriority(context: ExecutionContext): EqualsPriority {
		throw new Error("Method not implemented.");
	}

	protected equalsInternal(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false {
		throw new Error("Method not implemented.");
	}

	protected isProvedInternal(hypotheses: Expr[]): boolean {
		return this.expr.isProved(hypotheses);
	}

	protected getProofInternal(hypnumMap: Map<Expr, number>, $Map: Map<Expr, number | [number, number]>, ctr: Counter, root?: boolean): ProofType[] {

		$Map = new Map($Map);

		var def: ProofType = {
			_type: 'def',
			ctr: ctr.next(),
			var: this.variable
		};

		var $lines = this.def$s.map($ => {
			var lines = $.expr.getProof(hypnumMap, $Map, ctr);
			var $num = lines[lines.length - 1].ctr;
			$Map.set($, $num);
			return lines;
		}).flat(1);

		return [
			def,
			...$lines,
			...this.expr.getProof(hypnumMap, $Map, ctr)
		];
	}

	public toIndentedString(indent: number, root?: boolean): string {
		throw new Error("Method not implemented.");
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		throw new Error("Method not implemented.");
	}
}