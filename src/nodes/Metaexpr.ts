import ExecutionContext from "../ExecutionContext";
import StackTrace from "../StackTrace";
import Expr0 from "./Expr0";
import Node from "./Node";
import Type from "./Type";
import Variable from "./Variable";

/**
 * 숫자가 큰 것이 우선순위가 높다.
 */
export enum EqualsPriority {
	/** Variable */
	ZERO,
	/** Fun */
	ONE,
	/** Tee */
	TWO,
	/** Funcall */
	THREE,
	/** $Variable, Reduction */
	FOUR
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

	public abstract expandMetaInternal(andFuncalls: boolean): Metaexpr;

	public equals(obj: Metaexpr, context: ExecutionContext): boolean {
		if (this === obj) return true;
		if (!this.type.equals(obj.type)) return false;

		if (obj.getEqualsPriority() > this.getEqualsPriority())
			return obj.equalsInternal(this, context);
		
		return this.equalsInternal(obj, context);
	}

	protected abstract getEqualsPriority(): EqualsPriority;

	protected abstract equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean;
}