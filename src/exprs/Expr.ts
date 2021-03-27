import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import UniversalCounter from "../UniversalCounter";
import Fun from "./Fun";
import { Type } from "./types";
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

export type Precedence = boolean | number | [number, number];

export default abstract class Expr {
	
	public readonly _id: number;

	public readonly doc: string;
	public readonly tex: string;
	public readonly trace: StackTrace;
	public precedence: Precedence;

	public readonly type: Type;
	private expandMetaCache: Expr;

	public static readonly PREC_FUNEXPR = 1000;
	public static readonly PREC_COMMA = 1000;
	public static readonly PREC_COLONEQQ = 100000;

	constructor (doc: string, precedence: Precedence, tex: string, type: Type, trace: StackTrace) {
		this._id = UniversalCounter.next();
		this.doc = doc;
		this.precedence = precedence;
		this.tex = tex;

		if (!type) throw Expr.error('Assertion failed', trace);

		this.type = type;

		this.trace = trace;
	}

	public abstract substitute(map: Map<Variable, Expr>): Expr;

	public expand(): Expr {
		if (this.expandMetaCache) return this.expandMetaCache;
		return this.expandMetaCache = this.expandInternal();
	}

	protected abstract expandInternal(): Expr;

	/**
	 * 
	 * @return 같지 않으면 `false`. 같으면 같음을 보이는 데 사용한 매크로들의 목록.
	 */
	public equals(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false {
		// console.log(`${this}\n\n${obj}`);
		// var ret = (() => {
		
		if (this === obj) return [];
		if (!this.type.equals(obj.type)) return false;

		if (obj.getEqualsPriority(context) > this.getEqualsPriority(context))
			return obj.equalsInternal(this, context);
		
		return this.equalsInternal(obj, context);

		// })();
		// console.log(`${this}\n\n${obj}\n\nresult:`, ret);
		// return ret;
	}

	/**
	 * 
	 * @return 같지 않으면 `false`. 같으면 같음을 보이는 데 사용한 매크로들의 목록.
	 */
	protected abstract equalsInternal(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false;

	protected abstract getEqualsPriority(context: ExecutionContext): EqualsPriority;

	public isProved(hypotheses?: Expr[]): boolean {
		hypotheses = hypotheses || [];

		for (var i = 0; i < hypotheses.length; i++) {
			if (hypotheses[i] == this) return true;
		}

		return this.isProvedInternal(hypotheses);
	}

	protected abstract isProvedInternal(hypotheses: Expr[]): boolean;

	public getProof(
			hypnumMap: Map<Expr, number>,
			$Map: Map<Expr, number | [number, number]>,
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
			hypnumMap: Map<Expr, number>,
			$Map: Map<Expr, number | [number, number]>,
			ctr: Counter,
			root?: boolean): ProofType[];
	
	public toString() {
		return this.toIndentedString(0);
	}

	public abstract toIndentedString(indent: number, root?: boolean): string;
	public abstract toTeXString(prec?: Precedence, root?: boolean): string;

	public error(message: string) {
		return Expr.error(message, this.trace);
	}

	public static error(message: string, trace: StackTrace) {
		if (trace) {
			return trace.error(message);
		} else {
			return new Error(message);
		}
	}

	/*
	* false corresponds to 0.
	* true corresponds to w * 2.
	*/
	public static normalizePrecedence(prec: Precedence) {
		if (prec === false) return [0, 0];
		if (prec === true) return [2, 0];
		if (typeof prec == 'number') return [0, prec];

		if (!(prec instanceof Array && prec.length == 2)) {
			console.log(prec);
			throw Error('wut');
		}

		return prec || false;
	}

	public shouldConsolidate(prec: Precedence): boolean {
		var my = Expr.normalizePrecedence(this.precedence || false),
			your = Expr.normalizePrecedence(prec || false);

		if (my[0] == 0 && my[1] == 0) return false;

		return !(my[0] < your[0] || my[0] == your[0] && my[1] < your[1]);
	}

	public static escapeTeX(s: string): string {
		return s.replace(/&|%|\$|#|_|{|}|~|\^|\\/g, m => ({
			'&': '\\&', '%': '\\%', '$': '\\$',
			'#': '\\#', '_': '\\_', '{': '\\{',
			'}': '\\}',
			'~': '\\textasciitilde',
			'^': '\\textasciicircum',
			'\\': '\\textbackslash'
		})[m]);
	}

	public static makeTeXName(name: string): string {
		var alphabet = [
			"alpha", "beta", "gamma", "delta",
			"epsilon", "zeta", "eta", "theta",
			"iota", "kappa", "lambda", "mu",
			"nu", "xi", "omicron", "pi",
			"rho", "sigma", "tau", "upsilon",
			"phi", "chi", "psi", "omega"
		];

		var regex = new RegExp(`^(?:([a-z])|(${alphabet.join('|')}))([0-9]*)$`, 'i');
		var match = name.match(regex);

		if (match) {
			var letter = (() => {
				if (match[1]) return match[1];
				
				var capitalize = match[2].charCodeAt(0) <= 'Z'.charCodeAt(0);
				var commandName = match[2].toLowerCase();

				if (capitalize) {
					commandName = commandName[0].toUpperCase() + commandName.substring(1);
				}

				return '\\' + commandName;
			})();

			var subscript = (() => {
				if (!match[3]) return '';
				if (match[3].length == 1) return '_' + match[3];
				return `_{${match[3]}}`;
			})();

			return letter + subscript;
		}

		if (name.length == 1) {
			return Expr.escapeTeX(name);
		}

		return `\\mathrm{${Expr.escapeTeX(name)}}`;
	}

	public makeTeX(id, args, prec) {
		args = args || [];
		prec = prec || false;
		
		var ret = this.tex;

		if (this.shouldConsolidate(prec)) {
			ret = '\\left(' + ret + '\\right)';
		}

		return ret.replace(/#([0-9]+)/g, (match, g1) => {
			return args[g1 * 1 - 1] || `\\texttt{\\textcolor{red}{\\#${g1}}}`;
		}).replace(/<<(.+?)>>/, (_match, g1) => {
			return `\\href{#${id}}{${g1}}`;
		});
	}
}