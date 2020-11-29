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

	public shouldConsolidate(prec: Precedence): boolean {
		var my = Node.normalizePrecedence(this.precedence || false),
			your = Node.normalizePrecedence(prec || false);

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

	public static parseTeX(tex: string) {
		var precedence: Precedence = false;

		var code = tex.replace(/^!<prec=([0-9]+)>/, (match, g1) => {
			precedence = g1 * 1;
			return '';
		});

		return {precedence, code};
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
			return Node.escapeTeX(name);
		}

		return `\\mathrm{${Node.escapeTeX(name)}}`;
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