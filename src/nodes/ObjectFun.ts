import Fun from "./Fun";

export default class ObjectFun extends Fun {
	
	constructor ({doc, tex, annotations, sealed, rettype, name, params, expr}: ObjectFunArgumentType, trace: StackTrace) {
		super({doc, tex, annotations, sealed, rettype, name, params, expr}, trace);
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		if (!this.expr) return this;

		// 이름이 있는 것은 스코프 밖에서 보이지 않으므로 치환될 것을
		// 갖지 않는다는 생각이 들어 있다.
		if (this.name) return this;

		// 위의 this.name 조건을 지우면 특수한 경우에 이게 발생할지도 모른다.
		if (this.params.some(e => map.has(e)))
			throw Error('Parameter collision');

		return new ObjectFun({
			doc: null,
			tex: null,
			annotations: this.annotations,
			sealed: this.sealed,
			rettype: null,
			name: null,
			params: this.params,
			expr: this.expr.substitute(map)
		}, this.trace);
	}

	protected expandMetaInternal(andFuncalls: boolean): Metaexpr {
		if (!this.expr) return this;
		if (this.type instanceof ObjectType && this.name) return this;

		return new ObjectFun({
			doc: null,
			tex: null,
			annotations: this.annotations,
			sealed: this.sealed,
			rettype: null,
			name: null,
			params: this.params,
			expr: this.expr.expandMeta(andFuncalls)
		}, this.trace);
	}

	public isCallable(context: ExecutionContext): boolean {
		return this.expr && (!this.sealed || context.canUse(this));
	}

	public toIndentedString(indent: number, root?: boolean): string {
		if (this.name) return this.name;
		
		return [
			`ƒ ${this.name || ''}(${this.params.map(p => p.toIndentedString(indent)).join(', ')}) => {`,
			'\t' + this.expr.toIndentedString(indent + 1),
			'}'
		].join('\n' + '\t'.repeat(indent));
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		if (!this.name) {
			this.precedence = Metaexpr.PREC_FUNEXPR;
			return [
				(this.shouldConsolidate(prec) ? '\\left(' : ''),

				(
					this.params.length == 1
					? this.params[0].toTeXString(false)
					: `\\left(${this.params.map(e => e.toTeXString(Metaexpr.PREC_COMMA)).join(', ')}\\right)`
				),
				'\\mapsto ',
				this.expr.expandMeta(true).toTeXString(false),

				(this.shouldConsolidate(prec) ? '\\right)' : '')
			].join('');
		}

		if (!root)
			return `\\href{#def-${this.name}}{${Metaexpr.makeTeXName(this.name)}}`;
	
		if (!this.expr)
			return this.funcallToTeXString(this.params, prec);
	
		return this.funcallToTeXString(this.params, Metaexpr.PREC_COLONEQQ)
				+ `\\coloneqq ${this.expr.toTeXString(Metaexpr.PREC_COLONEQQ)}`;
	}

	public funcallToTeXString(args, prec) {
		args = args.map(arg => {
			return arg.toTeXString(this.tex ? this.precedence : Metaexpr.PREC_COMMA);
		});
	
		if (this.tex) {
			return this.makeTeX('def-' + this.name, args, prec);
		}
	
		return (
			!this.name
				? this.toTeXString(false)
				: `\\href{#def-${this.name}}{${Metaexpr.makeTeXName(this.name)}}`
		) + `\\mathord{\\left(${args.join(', ')}\\right)}`;
	}
}

import ExecutionContext from "../ExecutionContext";
import StackTrace from "../StackTrace";
import Expr0 from "./Expr0";
import Metaexpr, { Precedence } from "./Metaexpr";
import Variable from "./Variable";
import Parameter from "./Parameter";
import { Type, ObjectType } from "./types";

interface ObjectFunArgumentType {
	doc: string;
	tex: string;
	annotations: string[];
	sealed: boolean;
	rettype: Type;
	name: string;
	params: Parameter[];
	expr: Expr0;
}