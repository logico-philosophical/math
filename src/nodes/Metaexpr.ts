import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import Expr0 from "./Expr0";
import Node from "./Node";
import Type from "./Type";
import Variable from "./Variable";

/**
 * 숫자가 큰 것이 우선순위가 높다.
 */
export enum EqualsPriority {
	/** Variable (primitive) */
	ZERO,
	/** Fun */
	ONE,
	/** Tee */
	TWO,
	/** Funcall */
	THREE,
	/** Variable (macro) */
	FOUR,
	/** $Variable, Reduction */
	FIVE
}

export default abstract class Metaexpr extends Node {
	
	public readonly type: Type;
	private expandMetaCache: Metaexpr;

	constructor(trace: StackTrace, doc: string, tex: string, type: Type) {
		super(trace, doc, tex);

		if (!type) throw Node.error('Assertion failed', trace);

		this.type = type;
	}

	public abstract substitute(map: Map<Variable, Expr0>): Metaexpr;

	/**
	 * 
	 * @param andFuncalls 이름 없는 Funcall도 푼다.
	 */
	public expandMeta(andFuncalls: boolean): Metaexpr {
		if (this.expandMetaCache) return this.expandMetaCache;
		return this.expandMetaCache = this.expandMetaInternal(andFuncalls);
	}

	protected abstract expandMetaInternal(andFuncalls: boolean): Metaexpr;

	public equals(obj: Metaexpr, context: ExecutionContext): boolean {
		// console.log(`${this}\n\n${obj}`);
		// var ret = (() => {
		
		if (this === obj) return true;
		if (!this.type.equals(obj.type)) return false;

		if (obj.getEqualsPriority(context) > this.getEqualsPriority(context))
			return obj.equalsInternal(this, context);
		
		return this.equalsInternal(obj, context);

		// })();
		// console.log(`${this}\n\n${obj}\n\n${ret}`);
		// return ret;
	}

	protected abstract getEqualsPriority(context: ExecutionContext): EqualsPriority;

	protected abstract equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean;

	public isProved(hypotheses?: Metaexpr[]): boolean {
		hypotheses = hypotheses || [];

		for (var i = 0; i < hypotheses.length; i++) {
			if (hypotheses[i] == this) return true;
		}

		return this.isProvedInternal(hypotheses);
	}

	protected abstract isProvedInternal(hypotheses: Metaexpr[]): boolean;

	public getProof(
			hypnumMap: Map<Metaexpr, number>,
			$Map: Map<Metaexpr, number | [number, number]>,
			ctr: Counter,
			root: boolean=false): ProofType[] {
		
		if (hypnumMap.has(this)) {
			return [{
				_type: 'R',
				ctr: ctr.next(),
				num: hypnumMap.get(this),
				expr: this
			}];
		}

		if ($Map.has(this)) {
			return [{
				_type: 'R',
				ctr: ctr.next(),
				num: $Map.get(this),
				expr: this
			}];
		}

		return this.getProofInternal(hypnumMap, $Map, ctr, root);
	}

	protected abstract getProofInternal(
			hypnumMap: Map<Metaexpr, number>,
			$Map: Map<Metaexpr, number | [number, number]>,
			ctr: Counter,
			root?: boolean): ProofType[];
}