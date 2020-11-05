import StackTrace from '../StackTrace';

var ctr = 0;

export type Precedence = boolean | number | [number, number];

export default abstract class Node {
	public readonly _id: number;

	public readonly trace: StackTrace;
	public readonly doc: string;
	public readonly tex: string;
	public precedence: Precedence;

	public static readonly PREC_FUNEXPR = 1000;
	public static readonly PREC_COMMA = 1000;
	public static readonly PREC_COLONEQQ = 100000;

	constructor (trace: StackTrace, doc: string, tex: string) {
		this._id = ++ctr;
		this.trace = trace;
		this.doc = doc;
		this.tex = tex;
	}

	public toString() {
		return this.toIndentedString(0);
	}

	public abstract toIndentedString(indent: number, root?: boolean): string;
	public abstract toTeXString(prec?: Precedence, root?: boolean): string;

	public error(message: string) {
		return Node.error(message, this.trace);
	}

	public static error(message: string, trace: StackTrace) {
		if (trace) {
			return trace.error(message);
		} else {
			return new Error(message);
		}
	}

	public static escapeTeX(s) {
		return s.replace(/&|%|\$|#|_|{|}|~|\^|\\/g, m => ({
			'&': '\\&', '%': '\\%', '$': '\\$',
			'#': '\\#', '_': '\\_', '{': '\\{',
			'}': '\\}',
			'~': '\\textasciitilde',
			'^': '\\textasciicircum',
			'\\': '\\textbackslash'
		})[m]);
	}

	public static parseTeX(tex) {
		var precedence: Precedence = false;

		var code = tex.replace(/^!<prec=([0-9]+)>/, (match, g1) => {
			precedence = g1 * 1;
			return '';
		});

		return {precedence, code};
	}

	public isProved(hyps?): boolean {
		hyps = hyps || [];

		for (var i = 0; i < hyps.length; i++) {
			if (hyps[i] == this) return true;
		}

		return false;
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

		return prec;
	}

	public shouldConsolidate(prec: Precedence) {
		var my = Node.normalizePrecedence(this.precedence || false),
			your = Node.normalizePrecedence(prec || false);

		if (my[0] == 0 && my[1] == 0) return false;

		return !(my[0] < your[0] || my[0] == your[0] && my[1] < your[1]);
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