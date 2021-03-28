import Fun from "./Fun";

export type SchemaType = 'axiom' | 'theorem' | 'schema';

export default class Schema extends Fun {

	public readonly schemaType: SchemaType;
	public readonly def$s: $Variable[];
	public readonly context: ExecutionContext;
	private isProvedCache: boolean;

	constructor ({doc, tex, annotations, schemaType, name, params, context, def$s, expr}: SchemaArgumentType, trace: StackTrace) {
		if (!expr) {
			throw Expr.error('wut', trace);
		}

		if (schemaType != 'schema' && !name) {
			throw Expr.error(`wut`, trace);
		}

		var precedence = name ? false : Expr.PREC_FUNEXPR;

		super({doc, precedence, tex, annotations, rettype: null, name, params, expr}, trace);
		
		this.schemaType = schemaType;
		this.def$s = def$s || [];
		this.context = context;

		if (schemaType == 'theorem') {
			if (!this.isProved()) {
				throw Expr.error(`Schema ${name} is marked as a theorem but it is not proved`, trace);
			}
		}
	}
	
	protected isProvedInternal(hypotheses: Expr[]): boolean {
		if (this.isProvedCache) return true;

		if (hypotheses.length == 0 && typeof this.isProvedCache == 'boolean') {
			return this.isProvedCache;
		}

		var ret = this.schemaType == 'axiom' || this.expr.isProved(hypotheses);
		if (!hypotheses.length) this.isProvedCache = ret;
		return ret;
	}

	public substitute(map: Map<Variable, Expr>): Expr {
		// 이름이 있는 것은 치환될 것을 갖지 않아야 한다.
		if (this.name) return this;

		if (this.params.some(p => map.has(p))) {
			map = new Map(map);

			// (λx.t)[x := r] = λx.t
			this.params.forEach(p => {
				if (map.has(p)) {
					map.delete(p);
				}
			});
		}

		var expr = this.expr.substitute(map);
		if (expr == this.expr) return this;

		return new Schema({
			doc: null,
			tex: null,
			annotations: this.annotations,
			schemaType: 'schema',
			name: null,
			params: this.params,
			context: this.context,
			def$s: this.def$s,
			expr
		}, this.trace);
	}

	protected expandInternal(): Expr {
		return new Schema({
			doc: null,
			tex: null,
			annotations: this.annotations,
			schemaType: 'schema',
			name: null,
			params: this.params,
			context: this.context,
			def$s: this.def$s,
			expr: this.expr.expand()
		}, this.trace);
	}

	public isCallable(_context: ExecutionContext): boolean {
		return true;
	}

	public toIndentedString(indent: number, root?: boolean): string {
		return [
			`∫ ${this.name || ''}(${this.params.map(p => p.toIndentedString(indent)).join(', ')}) => {`,
			'\t' + this.expr.expand().toIndentedString(indent + 1),
			'}'
		].join('\n' + '\t'.repeat(indent));
	}
	
	public toTeXString(prec?: Precedence, root?: boolean): string {
		if (!this.name) {
			return [
				(this.shouldConsolidate(prec) ? '\\left(' : ''),

				(
					this.params.length == 1
					? this.params[0].toTeXString(false)
					: `\\left(${this.params.map(e => e.toTeXString(Expr.PREC_COMMA)).join(', ')}\\right)`
				),
				'\\mapsto ',
				this.expr.expand().toTeXString(false),

				(this.shouldConsolidate(prec) ? '\\right)' : '')
			].join('');
		}
		
		var id = 'def-' + this.name,
			proved = this.isProved() ? 'p' : 'np';
	
		if (!root)
			return `\\href{#${id}}{\\htmlData{proved=${proved}}{\\mathsf{${Expr.escapeTeX(this.name)}}}}`;
	
		return `\\href{#${id}}{\\htmlData{proved=${proved}}{\\mathsf{${Expr.escapeTeX(this.name)}}}}\\mathord{\\left(${this.params.map(e => e.toTeXStringWithId(Expr.PREC_COMMA) + (e.selector ? `: \\texttt{@${e.selector}}` : '')).join(', ')}\\right)}:\\\\\\quad`
				+ this.expr.expand().toTeXString(true);
	}
}

import $Variable from "./$Variable";
import Expr, { Precedence } from "./Expr";
import Variable from "./Variable";
import StackTrace from "../StackTrace";
import ExecutionContext from "../ExecutionContext";
import Parameter from "./Parameter";

interface SchemaArgumentType {
	doc: string;
	tex: string;
	annotations: string[];
	schemaType: SchemaType;
	name: string;
	params: Parameter[];
	context: ExecutionContext;
	def$s: $Variable[];
	expr: Expr;
}