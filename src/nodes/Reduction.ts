import StackTrace from '../StackTrace';
import Expr0 from './Expr0';
import Fun from './Fun';
import Funcall from './Funcall';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import Node, { Precedence } from './Node';
import ObjectType from './ObjectType';
import Tee from './Tee';
import Variable from './Variable';

interface ReductionArgumentType {
	subject: Metaexpr;
	guesses: Expr0[];
	leftargs: Metaexpr[];
	expected: Metaexpr;
}

export default class Reduction extends Metaexpr {
	
	public readonly subject: Metaexpr;
	public readonly guesses: Expr0[];
	public readonly leftargs: Metaexpr[];
	public readonly reduced: Metaexpr;

	constructor ({subject, guesses, leftargs, expected}: ReductionArgumentType, trace: StackTrace) {
		if (guesses) {
			let resolvedType = subject.type.resolve() as ObjectType | MetaType,
				paramTypes = resolvedType.from,
				argTypes = guesses.map(e => e && e.type);

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
				if (!(guesses && guesses[i]) && !p.guess) {
					throw Node.error(`Argument #${i + 1} could not be guessed`, trace);
				}
			});
	
			var derefs = subject.params.map((p, i) => {
				if (guesses && guesses[i]) return guesses[i];

				var tee = (subject as Fun).expr.expandMeta(false) as Tee;
	
				return Reduction.query(
					p.guess,
					tee.left,
					leftargs,
					tee.right,
					expected,
					trace
				);
			});
	
			subject = new Funcall({
				fun: subject,
				unseal: false,
				args: derefs,
			}, trace);
		} else if (guesses) {
			throw Node.error('Something\'s wrong', trace);
		}
	
		if (!(subject.type instanceof MetaType && subject.type.isSimple))
			throw Node.error('Subject is not reducible', trace);
	
		if (!(leftargs instanceof Array)
				|| leftargs.map(e => e instanceof Node).some(e => !e))
			throw Node.error('Assertion failed', trace);

		var paramTypes = subject.type.left,
			leftargTypes = leftargs.map(e => e.type);

		if (paramTypes.length != leftargTypes.length)
			throw Node.error(`Invalid number of arguments (expected ${paramTypes.length}): ${leftargTypes.length}`, trace);

		for (let i = 0; i < paramTypes.length; i++) {
			if (!paramTypes[i].equals(leftargTypes[i]))
				throw Node.error(`Illegal argument type (expected ${paramTypes[i]}): ${leftargTypes[i]}`, trace);
		}

		super(trace, null, null, subject.type.right);

		this.subject = subject;
		this.leftargs = leftargs;

		var tee = subject.expandMeta(true);

		if (!(tee instanceof Tee)) {
			throw Node.error('Assertion failed', trace);
		}

		var leftargsExpanded = leftargs.map(arg => {
			return arg.expandMeta(true);
		});

		for (let i = 0; i < tee.left.length; i++) {
			if (!tee.left[i].equals(leftargsExpanded[i])) {
				throw Node.error(`LHS #${i + 1} failed to match:

--- EXPECTED ---
${tee.left[i].expandMeta(true)}
----------------

--- RECEIVED ---
${leftargs[i].expandMeta(true)}
----------------`, trace);
			}
		}

		if (expected) {
			if (!tee.right.equals(expected)) {
				throw Node.error(`RHS failed to match:

--- EXPECTED ---
${tee.right.expandMeta(true)}
----------------

--- RECEIVED ---
${expected.expandMeta(true)}
----------------`, trace);
			}

			this.reduced = expected;
		} else {
			this.reduced = tee.right;
		}
	}

	public isProved(hyps?): boolean {
		hyps = hyps || [];
		
		return super.isProved(hyps)
			|| this.subject.isProved(hyps)
				&& this.leftargs.every(l => l.isProved(hyps));
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		return this.reduced.substitute(map);
	}

	public expandMeta(andFuncalls: boolean): Metaexpr {
		return this.reduced.expandMeta(andFuncalls);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.FOUR;
	}

	protected equalsInternal(obj: Metaexpr): boolean {
		return this.reduced.equals(obj);
	}

	public static query(guess: string, left, leftargs, right, expected, trace: StackTrace) {
		if (guess.length == 0) throw Node.error('wut', trace);

		var lef, ret;

		if (guess[0] == 'r') {
			if (!expected) {
				throw Node.error(`Cannot dereference @${guess}`, trace);
			}

			lef = right;
			ret = expected;
		} else {
			var n = Number(guess[0]);
			if (!(1 <= n && n <= leftargs.length))
				throw Node.error(`Cannot dereference @${guess}: antecedent index out of range`, trace);

			lef = left[n - 1];
			ret = leftargs[n - 1];
		}

		return (function recurse(guess: string, lef: Metaexpr, node: Metaexpr, ptr: number) {
			node = node.expandMeta(true);
			
			if (guess.length <= ptr) return node;

			if (/[0-9]/.test(guess[ptr])) {
				var n = Number(guess[ptr]);

				if (lef instanceof Tee && node instanceof Tee) {
					if (lef.left.length != node.left.length) {
						throw Node.error(`Cannot dereference @${guess}: antecedent length mismatch`, trace);
					}

					if (!(1 <= n && n <= node.left.length)) {
						throw Node.error(`Cannot dereference @${guess}: antecedent index out of range`, trace);
					}

					return recurse(guess, lef.left[n - 1], node.left[n - 1], ptr + 1);
				}

				while (true) {
					if (!(lef instanceof Funcall) || !(node instanceof Funcall)) {
						throw Node.error(`Cannot dereference @${guess}`, trace);
					}

					if (lef.fun.equals(node.fun)) {
						break;
					}

					if (!node.isExpandable()) {
						throw Node.error(`Cannot dereference @${guess}`, trace);
					}

					node = node.expandOnce();
				}

				if (!node.args || !(1 <= n && n <= node.args.length))
					throw Node.error(`Cannot dereference @${guess}`, trace);

				return recurse(guess, lef.args[n - 1], node.args[n - 1], ptr + 1);
			} else if (guess[ptr] == 'r') {
				if (lef instanceof Tee && node instanceof Tee) {
					return recurse(guess, lef.right, node.right, ptr + 1);
				}

				throw Node.error(`Cannot dereference @${guess}`, trace);
			}

			throw Node.error(`Cannot dereference @${guess}`, trace);
		})(guess, lef, ret, 1);
	}

	public toIndentedString(indent: number, root?: boolean): string {
		var leftargs: any = this.leftargs.map(arg => {
			return arg.toIndentedString(indent + 1);
		});
	
		if (leftargs.join('').length <= 50) {
			leftargs = this.leftargs.map(arg => {
				return arg.toIndentedString(indent);
			});
	
			leftargs = leftargs.join(', ');
	
			return [
				`${this.subject.toIndentedString(indent)}[`,
				leftargs,
				']'
			].join('');
		}
		else {
			leftargs = leftargs.join(',\n' + '\t'.repeat(indent + 1));
	
			return [
				`${this.subject.toIndentedString(indent)}[`,
				'\t' + leftargs,
				']'
			].join('\n' + '\t'.repeat(indent));
		}
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		return `${this.subject.toTeXString(false)}[${this.leftargs.map(e => e.toTeXString(Node.PREC_COMMA)).join(', ')}]`;
	}
}