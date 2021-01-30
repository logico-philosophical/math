import Expr0 from './Expr0';
import Nameable from './Nameable';

export default abstract class Fun extends Expr0 implements Nameable {

	public readonly annotations: string[];
	public readonly sealed: boolean;
	public readonly name: string;
	public readonly params: Parameter[];
	public readonly expr: Metaexpr;

	constructor ({doc, tex, annotations, sealed, rettype, name, params, expr}: FunArgumentType, trace: StackTrace) {
		if (!name && !expr)
			throw Node.error('Anonymous fun cannot be primitive', trace);

		if (rettype && expr) {
			if (!rettype.equals(expr.type)) {
				throw Node.error(`Expression type ${expr.type} failed to match the return type ${rettype} of fun ${name}`, trace);
			}
		}

		if (!rettype && !expr) {
			throw Node.error('Cannot guess the return type of a primitive fun', trace);
		}
		
		if (sealed && !expr) {
			throw Node.error('Cannot seal a primitive fun', trace);
		}
		
		var precedence = false;

		if (tex) {
			var parsed = Node.parseTeX(tex);
			precedence = parsed.precedence;
			tex = parsed.code;
		} else {
			tex = null;
		}
		
		super(
			trace, doc, tex,
			new ((rettype || expr.type) instanceof ObjectType ? ObjectType : MetaType)({
				functional: true,
				from: params.map(variable => variable.type),
				to: rettype || expr.type as any
			})
		);

		this.annotations = annotations;
		this.sealed = sealed;
		this.precedence = precedence;
		this.name = name;
		this.params = params;
		this.expr = expr;
	}

	protected isProvedInternal(hypotheses: Metaexpr[]): boolean {
		return this.expr && this.expr.isProved(hypotheses);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.ONE;
	}
	
	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): (Fun | Variable)[] | false {
		if (!(this.expr && !this.sealed)
				&& !(obj instanceof Fun && obj.expr && !obj.sealed)) {
			return false;
		}

		var placeholders = [];
		var types = (this.type.resolve() as ObjectType | MetaType).from;

		for (var i = 0; i < types.length; i++) {
			placeholders.push(new Parameter({
				type: types[i],
				name: '$' + i,
				selector: null
			}, this.trace));
		}

		var usedMacrosList = [];

		var thisCall = this.expr && !this.sealed
			? (this.name && usedMacrosList.push(this), this.call(placeholders))
			: new Funcall({
				fun: this,
				args: placeholders
			}, this.trace);

		var objCall = obj instanceof Fun && obj.expr && !obj.sealed
			? (obj.name && usedMacrosList.push(obj), obj.call(placeholders))
			: new Funcall({
				fun: obj,
				args: placeholders
			}, this.trace);
		
		var ret = thisCall.equals(objCall, context);
		return ret && ret.concat(usedMacrosList);
	}

	public abstract isCallable(context: ExecutionContext): boolean;

	public call(args: Expr0[]): Metaexpr {
		if (!this.expr) {
			throw Error('Cannot call a primitive fun');
		}

		if (this.params.length != args.length) {
			throw Error('Illegal arguments length');
		}

		var map: Map<Variable, Expr0> = new Map();

		for (var i = 0; i < this.params.length; i++) {
			map.set(this.params[i], args[i]);
		}

		return this.expr.substitute(map);
	}

	protected getProofInternal(
			hypnumMap: Map<Metaexpr, number>,
			$Map: Map<Metaexpr, number | [number, number]>,
			ctr: Counter,
			root: boolean=false): ProofType[] {
		
		if (this instanceof Schema && this.name && !root) {
			return [{
				_type: 'RS',
				ctr: ctr.next(),
				expr: this
			}];
		}

		if (!this.expr) {
			return [{
				_type: 'NP',
				ctr: ctr.next(),
				expr: this
			}];
		}

		$Map = new Map($Map);

		var start = ctr.peek() + 1;

		var $lines: ProofType[] = [];
		
		if (this instanceof Schema) {
			this.def$s.forEach($ => {
				var lines = $.expr.getProof(hypnumMap, $Map, ctr);
				$lines = $lines.concat(lines);

				var $num = lines[lines.length - 1].ctr;
				$Map.set($, $num);
			});
		}

		return [{
			_type: 'V',
			$lines,
			lines: this.expr.getProof(hypnumMap, $Map, ctr),
			params: this.params,
			ctr: [start, ctr.peek()]
		}];
	}
}

import Funcall from './Funcall';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import Node from './Node';
import ObjectType from './ObjectType';
import Type from './Type';
import Variable from './Variable';
import StackTrace from '../StackTrace';
import ExecutionContext from '../ExecutionContext';
import Counter from '../Counter';
import { ProofType } from '../ProofType';
import Schema from './Schema';
import Parameter from './Parameter';

interface FunArgumentType {
	doc: string;
	tex: string;
	annotations: string[];
	sealed: boolean;
	rettype: Type;
	name: string;
	params: Parameter[];
	expr: Metaexpr;
}