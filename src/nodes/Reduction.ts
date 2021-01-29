import Counter from '../Counter';
import ExecutionContext from '../ExecutionContext';
import { ProofType } from '../ProofType';
import StackTrace from '../StackTrace';
import Expr0 from './Expr0';
import Fun from './Fun';
import Funcall from './Funcall';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import { isNameable } from './Nameable';
import Node, { Precedence } from './Node';
import ObjectType from './ObjectType';
import Tee from './Tee';
import Variable from './Variable';

interface ReductionArgumentType {
	antecedents: Metaexpr[];
	subject: Metaexpr;
	args: (Expr0 | null)[];
	as: Metaexpr;
}

export default class Reduction extends Metaexpr {
	
	public readonly antecedents: Metaexpr[];
	public readonly subject: Metaexpr;
	public readonly args: (Expr0 | null)[];
	public readonly reduced: Metaexpr;

	constructor ({antecedents, subject, args, as}: ReductionArgumentType, context: ExecutionContext, trace: StackTrace) {
		if (args) {
			let resolvedType = subject.type.resolve() as ObjectType | MetaType,
				paramTypes = resolvedType.from,
				argTypes = args.map(e => e && e.type);

			if (paramTypes.length != argTypes.length)
				throw Node.error(`Invalid number of arguments (expected ${paramTypes.length}): ${argTypes.length}`, trace);

			for (var i = 0; i < paramTypes.length; i++) {
				if (argTypes[i] && !paramTypes[i].equals(argTypes[i])) {
					throw Node.error(`Argument #${i + 1} has illegal argument type (expected ${paramTypes[i]}): ${argTypes[i]}`, trace);
				}
			}
		}

		if (subject instanceof Fun) {
			subject.params.forEach((p, i) => {
				if (!(args && args[i]) && !p.selector) {
					throw Node.error(`Argument #${i + 1} could not be guessed`, trace);
				}
			});
	
			var derefs = subject.params.map((p, i) => {
				if (args && args[i]) return args[i];

				var tee = (subject as Fun).expr.expandMeta(false) as Tee;
	
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
			throw Node.error('Something\'s wrong', trace);
		}
	
		if (!(subject.type instanceof MetaType && subject.type.isSimple))
			throw Node.error('Subject is not reducible', trace);
	
		if (!(antecedents instanceof Array)
				|| antecedents.map(e => e instanceof Node).some(e => !e))
			throw Node.error('Assertion failed', trace);

		var paramTypes = subject.type.left,
			antecedentTypes = antecedents.map(e => e.type);

		if (paramTypes.length != antecedentTypes.length)
			throw Node.error(`Invalid number of arguments (expected ${paramTypes.length}): ${antecedentTypes.length}`, trace);

		for (let i = 0; i < paramTypes.length; i++) {
			if (!paramTypes[i].equals(antecedentTypes[i]))
				throw Node.error(`Illegal argument type (expected ${paramTypes[i]}): ${antecedentTypes[i]}`, trace);
		}

		super(trace, null, null, subject.type.right);

		this.subject = subject;
		this.antecedents = antecedents;

		var tee = subject.expandMeta(true);

		if (!(tee instanceof Tee)) {
			throw Node.error('Assertion failed', trace);
		}

		var antecedentsExpanded = antecedents.map(arg => {
			return arg.expandMeta(true);
		});

		for (let i = 0; i < tee.left.length; i++) {
			if (!tee.left[i].equals(antecedentsExpanded[i], context)) {
				throw Node.error(`LHS #${i + 1} failed to match:

--- EXPECTED ---
${tee.left[i].expandMeta(true)}
----------------

--- RECEIVED ---
${antecedents[i].expandMeta(true)}
----------------`, trace);
			}
		}

		if (as) {
			if (!tee.right.equals(as, context)) {
				throw Node.error(`RHS failed to match:

--- EXPECTED ---
${tee.right.expandMeta(true)}
----------------

--- RECEIVED (from [as ...]) ---
${as.expandMeta(true)}
----------------`, trace);
			}

			this.reduced = as;
		} else {
			this.reduced = tee.right;
		}
	}

	protected isProvedInternal(hypotheses: Metaexpr[]): boolean {
		return this.subject.isProved(hypotheses)
			&& this.antecedents.every(l => l.isProved(hypotheses));
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		return this.reduced.substitute(map);
	}

	protected expandMetaInternal(andFuncalls: boolean): Metaexpr {
		return this.reduced.expandMeta(andFuncalls);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.FIVE;
	}

	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		return this.reduced.equals(obj, context);
	}

	protected getProofInternal(
			hypnumMap: Map<Metaexpr, number>,
			$Map: Map<Metaexpr, number | [number, number]>,
			ctr: Counter): ProofType[] {
		
		var antecedentLines: ProofType[] = [];
		var antecedentNums: (number | [number, number])[] = this.antecedents.map(l => {
			if (hypnumMap.has(l)) return hypnumMap.get(l);
			if ($Map.has(l)) return $Map.get(l);

			var lines = l.getProof(hypnumMap, $Map, ctr);
			antecedentLines = antecedentLines.concat(lines);
			return lines[lines.length - 1].ctr;
		});
		
		var args: Expr0[] = null;
		var subjectlines: ProofType[] = [];
		var subjectnum = hypnumMap.get(this.subject)
			|| $Map.get(this.subject)
			|| (this.subject instanceof Funcall && $Map.has(this.subject.fun)
				? (args = this.subject.args, $Map.get(this.subject.fun))
				: false)
			|| ((s => s instanceof Fun && s.name
					|| s instanceof Funcall && isNameable(s.fun) && s.fun.name)(this.subject)
				? this.subject
				: (subjectlines = this.subject.getProof(hypnumMap, $Map, ctr))[subjectlines.length-1].ctr);

		return [
			...antecedentLines,
			...subjectlines,
			{
				_type: 'E',
				ctr: ctr.next(),
				subject: subjectnum,
				args,
				antecedents: antecedentNums,
				reduced: this.reduced
			}
		];
	}

	public static guess(
			selector: string,
			left: Metaexpr[], antecedents: Metaexpr[],
			right: Metaexpr, as: Metaexpr,
			context: ExecutionContext, trace: StackTrace): Metaexpr {
		
		if (selector.length == 0) throw Node.error('wut', trace);

		var parameter: Metaexpr, argument: Metaexpr;

		if (selector[0] == 'r') {
			if (!as) {
				throw Node.error(`Cannot dereference @${selector}: expected output is not given`, trace);
			}

			parameter = right;
			argument = as;
		} else {
			var n = Number(selector[0]);

			if (!(1 <= n && n <= antecedents.length))
				throw Node.error(`Cannot dereference @${selector}: antecedent index out of range`, trace);

			parameter = left[n - 1];
			argument = antecedents[n - 1];
		}

		return (function recurse(
				ptr: number,
				parameter: Metaexpr, argument: Metaexpr): Metaexpr {
			
			argument = argument.expandMeta(true);
			
			if (selector.length <= ptr) return argument;

			if (/^[0-9]$/.test(selector[ptr])) {
				var n = Number(selector[ptr]);

				if (parameter instanceof Tee && argument instanceof Tee) {
					if (parameter.left.length != argument.left.length) {
						throw Node.error(`Cannot dereference @${selector}: antecedent length mismatch`, trace);
					}

					if (!(1 <= n && n <= argument.left.length)) {
						throw Node.error(`Cannot dereference @${selector}: antecedent index out of range`, trace);
					}

					return recurse(ptr + 1, parameter.left[n - 1], argument.left[n - 1]);
				}

				while (true) {
					while (argument instanceof Variable && argument.expr) {
						argument = argument.expr;
					}

					if (!(parameter instanceof Funcall && argument instanceof Funcall)) {
						throw Node.error(`Cannot dereference @${selector}`, trace);
					}

					if (parameter.fun.equals(argument.fun, context)) {
						break;
					}

					if (!argument.isExpandable(context)) {
						throw Node.error(`Cannot dereference @${selector}`, trace);
					}

					argument = argument.expandOnce(context);
				}

				if (!(1 <= n && n <= argument.args.length))
					throw Node.error(`Cannot dereference @${selector}`, trace);

				return recurse(ptr + 1, parameter.args[n - 1], argument.args[n - 1]);
			} else if (selector[ptr] == 'r') {
				if (parameter instanceof Tee && argument instanceof Tee) {
					return recurse(ptr + 1, parameter.right, argument.right);
				}

				throw Node.error(`Cannot dereference @${selector}`, trace);
			}

			throw Node.error(`Cannot dereference @${selector}`, trace);
		})(1, parameter, argument);
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
		return `${this.subject.toTeXString(false)}[${this.antecedents.map(e => e.toTeXString(Node.PREC_COMMA)).join(', ')}]`;
	}
}