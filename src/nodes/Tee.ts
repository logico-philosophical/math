import StackTrace from '../StackTrace';
import $Variable from './$Variable';
import Expr0 from './Expr0';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import Node, { Precedence } from './Node';
import ObjectType from './ObjectType';
import Variable from './Variable';

interface TeeArgumentType {
	left: Metaexpr[];
	def$s?: $Variable[];
	right: Metaexpr;
}

export default class Tee extends Metaexpr {

	public readonly left;
	public readonly def$s: $Variable[];
	public readonly right;

	constructor ({left, def$s, right}: TeeArgumentType, trace: StackTrace) {
		if (!(left instanceof Array
				&& left.every(l => {
					return l.type instanceof ObjectType
						|| l.type instanceof MetaType;
				}))) {
			console.log(left);
			throw Node.error('Assertion failed', trace);
		}

		if (def$s && !(def$s instanceof Array && def$s.every($ => $ instanceof $Variable)))
			throw Node.error('Assertion failed', trace);

		if (!(right.type instanceof ObjectType || right.type instanceof MetaType)) {
			console.log(right);
			throw Node.error('Assertion failed', trace);
		}

		if (right.type.isFunctional) {
			throw Node.error('RHS of a rule cannot be a schema', trace);
		}

		super(trace, null, null, new MetaType({
			functional: false,
			left: left.map(e => e.type),
			right: right.type
		}));

		this.left = left;
		this.def$s = def$s || [];
		this.right = right;
		this.precedence = Node.PREC_COMMA;
	}

	public isProved(hyps?) {
		hyps = hyps || [];
	
		return super.isProved(hyps) || this.right.isProved(hyps.concat(this.left));
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		var left = this.left.map(e => e.substitute(map));
		var right = this.right.substitute(map);

		return new Tee({
			left, right
		}, this.trace);
	}

	public expandMeta(andFuncalls: boolean): Metaexpr {
		var left = this.left.map(lef => lef.expandMeta(andFuncalls));
		var right = this.right.expandMeta(andFuncalls);

		return new Tee({left, right}, this.trace);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.TWO;
	}

	protected equalsInternal(obj: Metaexpr): boolean {
		if (!(obj instanceof Tee)) {
			throw Error('Assertion failed');
		}

		if (this.left.length != obj.left.length) {
			throw Error('Assertion failed');
		}

		for (var i = 0; i < this.left.length; i++) {
			if (!this.left[i].equals(obj.left[i])) return false;
		}

		return this.right.equals(obj.right);
	}

	public toIndentedString(indent: number, root?: boolean): string {
		if (!this.left.length) {
			return '|- ' + this.right.toIndentedString(indent);
		}
	
		return [
			'\t' + this.left.map(e => e.toIndentedString(indent + 1)).join(',\n' + '\t'.repeat(indent + 1)),
			'|-',
			'\t' + this.right.toIndentedString(indent + 1)
		].join('\n' + '\t'.repeat(indent));
	}
	
	public toTeXString(prec?: Precedence, root?: boolean): string {
		var expanded = this.expandMeta(true) as Tee;

		return [
			(this.shouldConsolidate(prec) ? '\\left(' : ''),
			`{${expanded.left.map(e => e.toTeXString(Node.PREC_COMMA)).join(', ')} \\vdash ${expanded.right.toTeXString(Node.PREC_COMMA)}}`,
			(this.shouldConsolidate(prec) ? '\\right)' : '')
		].join('');
	}
}