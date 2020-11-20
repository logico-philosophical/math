import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import $Variable from "./$Variable";
import Expr0 from "./Expr0";
import Metaexpr, { EqualsPriority } from "./Metaexpr";
import { Precedence } from "./Node";
import Variable from "./Variable";

interface WithArgumentType {
	variable: Variable;
	def$s: $Variable[];
	expr: Metaexpr;
}

export default class With extends Metaexpr {

	public readonly variable: Variable;
	public readonly def$s: $Variable[];
	public readonly expr: Metaexpr;

	constructor({variable, def$s, expr}: WithArgumentType, trace: StackTrace) {
		super(trace, null, null, expr.type);

		this.variable = variable;
		this.def$s = def$s;
		this.expr = expr;
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		if (map.has(this.variable))
			throw Error('Parameter collision');
		
		map = new Map(map);
		map.set(this.variable, this.variable.expr);

		return this.expr.substitute(map);
	}

	protected expandMetaInternal(andFuncalls: boolean): Metaexpr {
		var map = new Map<Variable, Expr0>();
		map.set(this.variable, this.variable.expr);

		return this.expr.substitute(map).expandMeta(andFuncalls);
	}

	protected getEqualsPriority(context: ExecutionContext): EqualsPriority {
		throw new Error("Method not implemented.");
	}

	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		throw new Error("Method not implemented.");
	}

	protected isProvedInternal(hypotheses: Metaexpr[]): boolean {
		return this.expr.isProved(hypotheses);
	}

	protected getProofInternal(hypnumMap: Map<Metaexpr, number>, $Map: Map<Metaexpr, number | [number, number]>, ctr: Counter, root?: boolean): ProofType[] {

		$Map = new Map($Map);

		var $lines = this.def$s.map($ => {
			var lines = $.expr.getProof(hypnumMap, $Map, ctr);
			var $num = lines[lines.length - 1].ctr;
			$Map.set($, $num);
			return lines;
		}).flat(1);

		return [
			{
				_type: 'def',
				ctr: ctr.next(),
				var: this.variable
			},
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