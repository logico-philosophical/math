import ExecutionContext from '../ExecutionContext';
import StackTrace from '../StackTrace';
import $Variable from './$Variable';
import Expr0 from './Expr0';
import Fun from './Fun';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import { isNameable } from './Nameable';
import Node, { Precedence } from './Node';
import ObjectFun from './ObjectFun';
import ObjectType from './ObjectType';
import Schema from './Schema';
import Variable from './Variable';

interface FuncallArgumentType {
	fun: Metaexpr;
	args: Expr0[];
}

export default class Funcall extends Expr0 {
	
	public readonly fun: Metaexpr;
	public readonly args: Expr0[];

	constructor ({fun, args}: FuncallArgumentType, trace: StackTrace) {
		if (fun.type.isSimple) {
			var name = isNameable(fun) ? fun.name : '<anonymous>';
			throw Node.error(`${name} is not callable`, trace);
		}

		if (!(args instanceof Array) || args.map(e => e instanceof Node).some(e => !e))
			throw Node.error('Assertion failed', trace);
			 
		var resolvedType = fun.type.resolve() as ObjectType | MetaType,
			paramTypes = resolvedType.from,
			argTypes = args.map(e => e.type);

		if (paramTypes.length != argTypes.length)
			throw Node.error(`Invalid number of arguments (expected ${paramTypes.length}): ${argTypes.length}`, trace);

		for (var i = 0; i < paramTypes.length; i++) {
			if (!paramTypes[i].equals(argTypes[i])) {
				throw Node.error(`Argument #${i + 1} has illegal argument type (expected ${paramTypes[i]}): ${argTypes[i]}`, trace);
			}
		}

		super(trace, null, null, resolvedType.to);
		
		this.fun = fun;
		this.args = args;
	}

	public isProved(hyps?) {
		hyps = hyps || [];
	
		return super.isProved(hyps) || this.fun.isProved(hyps);
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		return new Funcall({
			fun: this.fun.substitute(map),
			args: this.args.map(arg => arg.substitute(map))
		}, this.trace);
	}

	public expandMeta(andFuncalls: boolean): Metaexpr {
		var fun = this.fun.expandMeta(andFuncalls),
			args = this.args.map(arg => arg.expandMeta(andFuncalls));
		
		if (!(fun instanceof Fun) || !fun.expr || fun.name && !(fun instanceof Schema))
			return new Funcall({fun, args}, this.trace);

		return fun.call(args).expandMeta(andFuncalls);
	}

	public isExpandable(context: ExecutionContext): boolean {
		var callee: Metaexpr = this.fun;

		while (callee instanceof $Variable) {
			callee = callee.expr;
		}

		if (callee instanceof Funcall) {
			return callee.isExpandable(context);
		}

		if (!(callee instanceof Fun)) return false;

		return callee.isCallable(context);
	}
	
	public expandOnce(context: ExecutionContext): Metaexpr {
		if (!this.isExpandable(context)) {
			throw Error('Cannot expand');
		}

		var callee: Metaexpr = this.fun;

		while (callee instanceof $Variable) {
			callee = callee.expr;
		}

		if (callee instanceof Funcall) {
			return new Funcall({
				fun: callee.expandOnce(context),
				args: this.args
			}, this.trace);
		}

		if (!(callee instanceof Fun)) {
			throw Error('Something\'s wrong');
		}

		return callee.call(this.args);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.THREE;
	}

	protected equalsInternal(obj: Metaexpr, context: ExecutionContext): boolean {
		if (!(obj instanceof Funcall)) {
			if (!this.isExpandable(context)) return false;

			return this.expandOnce(context).equals(obj, context);
		}

		if (this.fun.equals(obj.fun, context)) {
			for (var i = 0; i < this.args.length; i++) {
				if (!this.args[i].equals(obj.args[i], context)) return false;
			}

			return true;
		}

		if (this.fun instanceof Funcall && this.fun.isExpandable(context)) {
			return this.expandOnce(context).equals(obj, context);
		}

		if (obj.fun instanceof Funcall && obj.fun.isExpandable(context)) {
			return this.equals(obj.expandOnce(context), context);
		}

		var thisIsExpandable = this.isExpandable(context),
			objIsExpandable = obj.isExpandable(context);
		
		if (this.fun == obj.fun || !thisIsExpandable && !objIsExpandable) {
			if (this.fun != obj.fun) return false;

			if (!thisIsExpandable && !objIsExpandable) {
				for (var i = 0; i < this.args.length; i++) {
					if (!this.args[i].equals(obj.args[i], context)) return false;
				}

				return true;
			}

			if (this.args.every((_, i) => {
				return this.args[i].equals(obj.args[i], context);
			})) {
				return true;
			}
		}

		if (thisIsExpandable) {
			return this.expandOnce(context).equals(obj, context);
		}

		return this.equals(obj.expandOnce(context), context);
	}

	public toIndentedString(indent: number, root?: boolean): string {
		var args: any = this.args.map(arg => {
			if (arg instanceof Variable) return `${arg.name}<${arg._id}>`;
			return arg.toIndentedString(indent + 1);
		});
	
		if (args.join('').length <= 50) {
			args = this.args.map(arg => {
				if (arg instanceof Variable) return `${arg.name}<${arg._id}>`;
				return arg.toIndentedString(indent);
			});
	
			args = args.join(', ');
			
			if (this.fun instanceof Schema) {
				return `${this.fun.name || `(${this.fun})`}(${args})`;
			} else {
				return [
					!(this.fun instanceof Fun) || !this.fun.name
						? '(' + this.fun.toIndentedString(indent) + ')'
						: this.fun.name,
					`(${args})`
				].join('');
			}
		} else {
			args = args.join(',\n' + '\t'.repeat(indent + 1));
			
			if (this.fun instanceof Schema) {
				return [
					this.fun.name || `(${this.fun.toIndentedString(indent)})`,
					'(',
					'\t' + args,
					')'
				].join('\n' + '\t'.repeat(indent));
			} else {
				return [
					(
						!(this.fun instanceof Fun) || !('name' in this.fun && this.fun.name)
							? '(' + this.fun.toIndentedString(indent) + ')'
							: this.fun.name
					) + '(',
					'\t' + args,
					')'
				].join('\n' + '\t'.repeat(indent));
			}
		}
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		if (this.fun instanceof Schema) {
			return (
				this.fun.name
					? `\\href{#schema-${this.fun.isProved() ? 'p' : 'np'}-${this.fun.name}}{\\textsf{${Node.escapeTeX(this.fun.name)}}}`
					: this.fun.toTeXString(false)
			) + `\\mathord{\\left(${this.args.map(arg => {
				return arg.toTeXString(Node.PREC_COMMA);
			}).join(', ')}\\right)}`;
		}

		if (this.fun instanceof ObjectFun)
			return this.fun.funcallToTeXString(this.args, prec);
		
		var args = this.args.map(arg => {
			return arg.toTeXString(Node.PREC_COMMA);
		});

		return (
			!(isNameable(this.fun) && this.fun.name) || this.fun instanceof Variable
				? this.fun.toTeXString(false)
				: this.fun.name.length == 1
					? Node.escapeTeX(this.fun.name)
					: `\\mathrm{${Node.escapeTeX(this.fun.name)}}`
		) + `\\mathord{\\left(${args.join(', ')}\\right)}`;
	}
}