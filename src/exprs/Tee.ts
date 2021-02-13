import Counter from '../Counter';
import ExecutionContext from '../ExecutionContext';
import { ProofType } from '../ProofType';
import StackTrace from '../StackTrace';
import $Variable from './$Variable';
import ObjectExpr from './ObjectExpr';
import Fun from './Fun';
import Expr, { EqualsPriority, Precedence } from './Expr';
import { ObjectType, Type, TeeType } from './types';
import Variable from './Variable';

interface TeeArgumentType {
	left: Expr[];
	def$s: $Variable[];
	right: Expr;
}

export default class Tee extends Expr {

	public readonly left: Expr[];
	public readonly def$s: $Variable[];
	public readonly right: Expr;

	constructor ({left, def$s, right}: TeeArgumentType, trace: StackTrace) {
		if (!(left instanceof Array
				&& left.every(l => {
					return l.type instanceof ObjectType
						|| l.type instanceof Type;
				}))) {
			console.log(left);
			throw Expr.error('Assertion failed', trace);
		}

		if (def$s && !(def$s instanceof Array && def$s.every($ => $ instanceof $Variable)))
			throw Expr.error('Assertion failed', trace);

		if (!(right.type instanceof ObjectType || right.type instanceof Type)) {
			console.log(right);
			throw Expr.error('Assertion failed', trace);
		}

		super(null, null, new TeeType({
			left: left.map(e => e.type),
			right: right.type
		}, trace), trace);

		this.left = left;
		this.def$s = def$s || [];
		this.right = right;
		this.precedence = Expr.PREC_COMMA;
	}

	protected isProvedInternal(hypotheses: Expr[]): boolean {
		return this.right.isProved(hypotheses.concat(this.left));
	}

	public substitute(map: Map<Variable, ObjectExpr>): Expr {
		var left = this.left.map(e => e.substitute(map));
		var right = this.right.substitute(map);

		return new Tee({
			left,
			def$s: null,
			right
		}, this.trace);
	}

	protected expandMetaInternal(andFuncalls: boolean): Expr {
		var left = this.left.map(lef => lef.expandMeta(andFuncalls));
		var right = this.right.expandMeta(andFuncalls);

		return new Tee({left, def$s: null, right}, this.trace);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.TWO;
	}

	protected equalsInternal(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false {
		if (!(obj instanceof Tee)) {
			throw Error('Assertion failed');
		}

		if (this.left.length != obj.left.length) {
			throw Error('Assertion failed');
		}

		for (var i = 0; i < this.left.length; i++) {
			if (!this.left[i].equals(obj.left[i], context)) return false;
		}

		return this.right.equals(obj.right, context);
	}

	protected getProofInternal(
			hypnumMap: Map<Expr, number>,
			$Map: Map<Expr, number | [number, number]>,
			ctr: Counter): ProofType[] {
		
		hypnumMap = new Map(hypnumMap);

		var start = ctr.peek() + 1;

		var leftlines: ProofType[] = this.left.map(l => {
			hypnumMap.set(l, ctr.next());
			
			return {
				_type: 'H',
				ctr: ctr.peek(),
				expr: l
			};
		});

		$Map = new Map($Map);

		var $lines = this.def$s.map($ => {
			var lines = $.expr.getProof(hypnumMap, $Map, ctr);
			var $num = lines[lines.length - 1].ctr;
			$Map.set($, $num);
			return lines;
		}).flat(1);

		return [{
			_type: 'T',
			leftlines: leftlines as any,
			rightlines: $lines.concat(this.right.getProof(hypnumMap, $Map, ctr)),
			ctr: [start, ctr.peek()]
		}];
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
			`{${expanded.left.map(e => e.toTeXString(Expr.PREC_COMMA)).join(', ')} \\vdash ${expanded.right.toTeXString(Expr.PREC_COMMA)}}`,
			(this.shouldConsolidate(prec) ? '\\right)' : '')
		].join('');
	}
}