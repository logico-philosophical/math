import Counter from "../Counter";
import ExecutionContext from "../ExecutionContext";
import { ProofType } from "../ProofType";
import StackTrace from "../StackTrace";
import Fun from "./Fun";
import Funcall from "./Funcall";
import Expr, { EqualsPriority, Precedence } from "./Expr";
import { isNameable } from "./Nameable";
import Parameter from "./Parameter";
import Schema from "./Schema";
import Tee from "./Tee";
import { FunctionalObjectType, FunctionalMetaType, TeeType } from "./types";
import Variable from "./Variable";

interface ReductionArgumentType {
	antecedents: Expr[];
	subject: Expr;
	args: (Expr | null)[];
	as: Expr;
}

export default class Reduction extends Expr {
	
	public readonly antecedents: Expr[];
	public readonly requiredAntecedents: Expr[];
	public readonly subject: Expr;
	public readonly args: (Expr | null)[];
	public readonly preFormatConsequent: Expr;
	public readonly consequent: Expr;
	private readonly antecedentEqualsResults: (Fun | Variable)[][];
	private readonly rightEqualsResult: (Fun | Variable)[];

	constructor ({antecedents, subject, args, as}: ReductionArgumentType, context: ExecutionContext, trace: StackTrace) {
		if (args) {
			let resolvedType = subject.type.resolve() as FunctionalObjectType | FunctionalMetaType,
				paramTypes = resolvedType.from,
				argTypes = args.map(e => e && e.type);

			if (paramTypes.length != argTypes.length)
				throw Expr.error(`Invalid number of arguments (expected ${paramTypes.length}): ${argTypes.length}`, trace);

			for (var i = 0; i < paramTypes.length; i++) {
				if (argTypes[i] && !paramTypes[i].equals(argTypes[i])) {
					throw Expr.error(`Argument #${i + 1} has illegal argument type (expected ${paramTypes[i]}): ${argTypes[i]}`, trace);
				}
			}
		}

		if (subject instanceof Fun) {
			subject.params.forEach((p, i) => {
				if (!(args && args[i]) && !p.selector) {
					throw Expr.error(`Argument #${i + 1} could not be guessed`, trace);
				}
			});
	
			var derefs = subject.params.map((p, i) => {
				if (args && args[i]) return args[i];

				var tee = (subject as Fun).expr.expandMeta(false);

				if (!(tee instanceof Tee)) throw Error('wut');
	
				return Reduction.guess(
					p.selector,
					tee.left, antecedents,
					tee.right, as,
					context, trace
				);
			});
	
			subject = new Funcall({
				fun: subject,
				args: derefs,
			}, trace);
		} else if (args) {
			throw Expr.error('Something\'s wrong', trace);
		}
	
		if (!(subject.type instanceof TeeType))
			throw Expr.error('Subject is not reducible', trace);
	
		if (!(antecedents instanceof Array)
				|| antecedents.map(e => e instanceof Expr).some(e => !e))
			throw Expr.error('Assertion failed', trace);

		var paramTypes = subject.type.left,
			antecedentTypes = antecedents.map(e => e.type);

		if (paramTypes.length != antecedentTypes.length)
			throw Expr.error(`Invalid number of arguments (expected ${paramTypes.length}): ${antecedentTypes.length}`, trace);

		for (let i = 0; i < paramTypes.length; i++) {
			if (!paramTypes[i].equals(antecedentTypes[i]))
				throw Expr.error(`Illegal argument type (expected ${paramTypes[i]}): ${antecedentTypes[i]}`, trace);
		}

		super(null, null, subject.type.right, trace);

		this.subject = subject;
		this.antecedents = antecedents;

		var tee = subject.expandMeta(true);

		if (!(tee instanceof Tee)) {
			throw Expr.error('Assertion failed', trace);
		}

		this.requiredAntecedents = tee.left;
		this.antecedentEqualsResults = Array(tee.left.length).fill(0).map(() => []);

		var antecedentsExpanded = antecedents.map(arg => {
			return arg.expandMeta(true);
		});

		for (let i = 0; i < tee.left.length; i++) {
			var tmp = tee.left[i].equals(antecedentsExpanded[i], context);
			if (!tmp) {
				throw Expr.error(`LHS #${i + 1} failed to match:

--- EXPECTED ---
${tee.left[i].expandMeta(true)}
----------------

--- RECEIVED ---
${antecedents[i].expandMeta(true)}
----------------`, trace);
			}

			this.antecedentEqualsResults[i] = tmp;
		}

		this.preFormatConsequent = tee.right;

		if (as) {
			var tmp = tee.right.equals(as, context);
			if (!tmp) {
				throw Expr.error(`RHS failed to match:

--- EXPECTED ---
${tee.right.expandMeta(true)}
----------------

--- RECEIVED (from [as ...]) ---
${as.expandMeta(true)}
----------------`, trace);
			}

			this.rightEqualsResult = tmp;
			this.consequent = as;
		} else {
			this.consequent = tee.right;
		}
	}

	protected isProvedInternal(hypotheses: Expr[]): boolean {
		return this.subject.isProved(hypotheses)
			&& this.antecedents.every(l => l.isProved(hypotheses));
	}

	public substitute(map: Map<Variable, Expr>): Expr {
		return this.consequent.substitute(map);
	}

	protected expandMetaInternal(andFuncalls: boolean): Expr {
		return this.consequent.expandMeta(andFuncalls);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.FIVE;
	}

	protected equalsInternal(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false {
		return this.consequent.equals(obj, context);
	}

	protected getProofInternal(
			hypnumMap: Map<Expr, number>,
			$Map: Map<Expr, number | [number, number]>,
			ctr: Counter): ProofType[] {
		
		var antecedentLinesList: ProofType[][] = [];
		var antecedentNums: (number | [number, number])[] = this.antecedents.map((l, i) => {
			if (!this.antecedentEqualsResults[i].length) {
				if (hypnumMap.has(l)) return hypnumMap.get(l);
				if ($Map.has(l)) return $Map.get(l);
			}

			var ref = hypnumMap.has(l)
				? hypnumMap.get(l)
				: $Map.has(l)
					? $Map.get(l)
					: null;
			var lines = ref ? [] : l.getProof(hypnumMap, $Map, ctr);

			if (this.antecedentEqualsResults[i].length) {
				lines.push({
					_type: 'bydef',
					ctr: ctr.next(),
					ref: ref || lines[lines.length - 1].ctr,
					expr: this.requiredAntecedents[i],
					of: this.antecedentEqualsResults[i]
				});
			}

			antecedentLinesList.push(lines);
			return this.antecedentEqualsResults[i].length
				? ctr.peek()
				: lines[lines.length - 1].ctr;
		});
		
		var args: Expr[] = null;
		var subjectlines: ProofType[] = [];
		var subjectnum = hypnumMap.get(this.subject)
			|| $Map.get(this.subject)
			|| (
				this.subject instanceof Funcall && $Map.has(this.subject.fun)
					? (args = this.subject.args, $Map.get(this.subject.fun))
					: false
			)
			|| (
				(s => {
					return s instanceof Fun && s.name
						|| s instanceof Funcall && isNameable(s.fun) && s.fun.name;
				})(this.subject)
					? this.subject
					: (subjectlines = this.subject.getProof(hypnumMap, $Map, ctr))[subjectlines.length-1].ctr
			);

		var ret: ProofType[] = [
			...antecedentLinesList.flat(),
			...subjectlines
		];

		if (this.rightEqualsResult && this.rightEqualsResult.length) {
			ret.push(
				{
					_type: 'TE',
					ctr: ctr.next(),
					subject: subjectnum,
					args,
					antecedents: antecedentNums,
					reduced: this.preFormatConsequent
				},
				{
					_type: 'bydef',
					ref: ctr.peek(),
					ctr: ctr.next(),
					expr: this.consequent,
					of: this.rightEqualsResult
				}
			);
		} else {
			ret.push({
				_type: 'TE',
				ctr: ctr.next(),
				subject: subjectnum,
				args,
				antecedents: antecedentNums,
				reduced: this.consequent
			});
		}
		
		return ret;
	}

	public static guess(
			selector: string,
			requiredAntecedents: Expr[], antecedents: Expr[],
			right: Expr, as: Expr,
			context: ExecutionContext, trace: StackTrace): Expr {
		
		if (selector.length == 0) throw Expr.error('wut', trace);

		var pattern: Expr, instance: Expr;

		if (selector[0] == 'r') {
			if (!as) {
				throw Expr.error(`Cannot dereference @${selector} (at 0): expected output is not given`, trace);
			}

			pattern = right;
			instance = as;
		} else {
			var n = Number(selector[0]);

			if (!(1 <= n && n <= antecedents.length))
				throw Expr.error(`Cannot dereference @${selector} (at 0): antecedent index out of range`, trace);

			pattern = requiredAntecedents[n - 1];
			instance = antecedents[n - 1];
		}

		return (function recurse(
				ptr: number,
				pattern: Expr, instance: Expr,
				params: Parameter[]): Expr {
			
			instance = instance.expandMeta(true);
			
			if (selector.length <= ptr) return instance;

			if (/^[0-9]$/.test(selector[ptr])) {
				var n = Number(selector[ptr]);

				if (pattern instanceof Tee && instance instanceof Tee) {
					if (pattern.left.length != instance.left.length) {
						throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): antecedent length mismatch`, trace);
					}

					if (!(1 <= n && n <= instance.left.length)) {
						throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): antecedent index out of range`, trace);
					}

					return recurse(ptr + 1, pattern.left[n - 1], instance.left[n - 1], params);
				}

				while (true) {
					while (instance instanceof Variable && instance.expr) {
						instance = instance.expr;
					}

					if (!(pattern instanceof Funcall && instance instanceof Funcall)) {
						throw Expr.error(`Cannot dereference @${selector} (at ${ptr})`, trace);
					}

					if (pattern.fun.equals(instance.fun, context)) {
						break;
					}

					if (!instance.isExpandable(context)) {
						throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): ${instance}`, trace);
					}

					instance = instance.expandOnce(context).expanded;
				}

				if (!(1 <= n && n <= instance.args.length))
					throw Expr.error(`Cannot dereference @${selector} (at ${ptr})`, trace);

				return recurse(ptr + 1, pattern.args[n - 1], instance.args[n - 1], params);
			} else if (selector[ptr] == 'r') {
				if (!(pattern instanceof Tee && instance instanceof Tee)) {
					throw Expr.error(`Cannot dereference @${selector} (at ${ptr})`, trace);
				}

				return recurse(ptr + 1, pattern.right, instance.right, params);
			} else if (selector[ptr] == 'c') {
				if (!(
					pattern instanceof Fun && !pattern.name
					&& instance instanceof Fun && !instance.name
				)) {
					throw Expr.error(`Cannot dereference @${selector} (at ${ptr})`, trace);
				}

				if (pattern.length != instance.length) {
					throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): parameter length mismatch`, trace);
				}

				var placeholders = [];

				for (var i = 0; i < pattern.length; i++) {
					if (!pattern.params[i].type.equals(instance.params[i].type)) {
						throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): parameter type mismatch`, trace);
					}

					placeholders.push(new Parameter({
						tex: instance.params[i].tex,
						type: pattern.params[i].type,
						name: instance.params[i].name,
						selector: null
					}, trace));
				}

				return recurse(ptr + 1, pattern.call(placeholders), instance.call(placeholders), placeholders.concat(params));
			} else if (selector[ptr] == 'f') {
				if (ptr != selector.length - 1) {
					throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): invalid selector`, trace);
				}

				// (($0, $1) => f($0, $1)) -> f
				if (instance instanceof Funcall
						&& instance.args.length == params.length
						&& instance.args.every((arg, i) => arg == params[i])) {
					return instance.fun;
				}

				return new Schema({
					doc: null,
					tex: null,
					annotations: [],
					schemaType: 'schema',
					name: null,
					params,
					context: new ExecutionContext(),
					def$s: [],
					expr: instance
				}, trace);
			}

			throw Expr.error(`Cannot dereference @${selector} (at ${ptr}): invalid selector`, trace);
		})(1, pattern, instance, []);
	}

	public toIndentedString(indent: number, root?: boolean): string {
		var antecedents = this.antecedents.map(arg => {
			return arg.toIndentedString(indent + 1);
		});
	
		if (antecedents.join('').length <= 50) {
			antecedents = this.antecedents.map(arg => {
				return arg.toIndentedString(indent);
			});
	
			return [
				`${this.subject.toIndentedString(indent)}[`,
				antecedents.join(', '),
				']'
			].join('');
		}

		return [
			`${this.subject.toIndentedString(indent)}[`,
			'\t' + antecedents.join(',\n' + '\t'.repeat(indent + 1)),
			']'
		].join('\n' + '\t'.repeat(indent));
		
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		return `${this.subject.toTeXString(false)}[${this.antecedents.map(e => e.toTeXString(Expr.PREC_COMMA)).join(', ')}]`;
	}
}