import Expr, { EqualsPriority, Precedence } from './Expr';

interface FuncallArgumentType {
	fun: Expr;
	args: Expr[];
}

export default class Funcall extends Expr {
	
	public readonly fun: Expr;
	public readonly args: Expr[];

	constructor ({fun, args}: FuncallArgumentType, trace: StackTrace) {
		if (!fun.type.isFunctional()) {
			var name = isNameable(fun) ? fun.name : '<anonymous>';
			throw Expr.error(`${name} is not callable`, trace);
		}

		if (!(args instanceof Array) || args.map(e => e instanceof Expr).some(e => !e))
			throw Expr.error('Assertion failed', trace);
			 
		var resolvedType = fun.type.resolve() as FunctionalObjectType | FunctionalMetaType,
			paramTypes = resolvedType.from,
			argTypes = args.map(e => e.type);

		if (paramTypes.length != argTypes.length)
			throw Expr.error(`Invalid number of arguments (expected ${paramTypes.length}): ${argTypes.length}`, trace);

		for (var i = 0; i < paramTypes.length; i++) {
			if (!paramTypes[i].equals(argTypes[i])) {
				throw Expr.error(`Argument #${i + 1} has illegal argument type (expected ${paramTypes[i]}): ${argTypes[i]}`, trace);
			}
		}

		super(null, false, null, resolvedType.to, trace);
		
		this.fun = fun;
		this.args = args;
	}

	protected isProvedInternal(hypotheses: Expr[]): boolean {
		return this.fun.isProved(hypotheses);
	}

	public substitute(map: Map<Variable, Expr>): Expr {
		return new Funcall({
			fun: this.fun.substitute(map),
			args: this.args.map(arg => arg.substitute(map))
		}, this.trace);
	}

	protected expandMetaInternal(andFuncalls: boolean): Expr {
		var fun = this.fun.expandMeta(andFuncalls),
			args = this.args.map(arg => arg.expandMeta(andFuncalls));
		
		if (!(fun instanceof Fun) || !fun.expr || fun.name && !(fun instanceof Schema))
			return new Funcall({fun, args}, this.trace);

		return fun.call(args).expandMeta(andFuncalls);
	}

	public isExpandable(context: ExecutionContext): boolean {
		var callee: Expr = this.fun;

		while (callee instanceof $Variable) {
			callee = callee.expr;
		}

		if (callee instanceof Variable && callee.expr) {
			return true;
		}

		if (callee instanceof Funcall) {
			return callee.isExpandable(context);
		}

		if (!(callee instanceof Fun)) return false;

		return callee.isCallable(context);
	}
	
	public expandOnce(context: ExecutionContext): {expanded: Expr, used: (Fun | Variable)[]} {
		if (!this.isExpandable(context)) {
			throw Error('Cannot expand');
		}

		var used: (Fun | Variable)[] = [];

		var callee: Expr = this.fun;

		while (callee instanceof $Variable) {
			callee = callee.expr;
		}

		if (callee instanceof Variable && callee.expr) {
			used.push(callee);

			return {
				expanded: new Funcall({
					fun: callee.expr,
					args: this.args
				}, this.trace),
				used
			};
		}

		if (callee instanceof Funcall) {
			var calleeExpanded = callee.expandOnce(context);
			used.push(...calleeExpanded.used);
			return {
				expanded: new Funcall({
					fun: calleeExpanded.expanded,
					args: this.args
				}, this.trace),
				used
			};
		}

		if (!(callee instanceof Fun)) {
			throw Error('Something\'s wrong');
		}

		if (callee.name) used.push(callee);

		return {
			expanded: callee.call(this.args),
			used
		};
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.THREE;
	}

	protected equalsInternal(obj: Expr, context: ExecutionContext): (Fun | Variable)[] | false {
		if (!(obj instanceof Funcall)) {
			if (!this.isExpandable(context)) return false;
			
			var {expanded, used} = this.expandOnce(context);
			var ret = expanded.equals(obj, context);
			return ret && ret.concat(used);
		}

		var argsEquals: (Fun | Variable)[] | false = (() => {
			if (this.args.length != obj.args.length) return false;

			var tmp: (Fun | Variable)[] = [];

			for (var i = 0; i < this.args.length; i++) {
				var e = this.args[i].equals(obj.args[i], context);
				if (!e) return false;
				tmp = tmp.concat(e);
			}

			return tmp;
		})();

		if (argsEquals) {
			var funEquals = this.fun.equals(obj.fun, context);
			if (funEquals) return funEquals.concat(argsEquals);
		}

		if (this.isExpandable(context)) {
			var {expanded, used} = this.expandOnce(context);
			var ret = expanded.equals(obj, context);
			return ret && ret.concat(used);
		}

		if (obj.isExpandable(context)) {
			var {expanded, used} = obj.expandOnce(context);
			var ret = this.equals(expanded, context);
			return ret && ret.concat(used);
		}

		return false;
	}

	protected getProofInternal(
			hypnumMap: Map<Expr, number>,
			$Map: Map<Expr, number | [number, number]>,
			ctr: Counter): ProofType[] {

		if (hypnumMap.has(this.fun)) {
			return [{
				_type: 'SE',
				ctr: ctr.next(),
				schema: hypnumMap.get(this.fun),
				args: this.args,
				expr: this
			}];
		}

		if ($Map.has(this.fun)) {
			return [{
				_type: 'SE',
				ctr: ctr.next(),
				schema: $Map.get(this.fun),
				args: this.args,
				expr: this
			}];
		}

		if (this.fun instanceof Schema && this.fun.name) {
			return [{
				_type: 'RC',
				ctr: ctr.next(),
				expr: this
			}];
		}

		if (!(this.fun instanceof Schema)) {
			return [{
				_type: 'NP',
				ctr: ctr.next(),
				expr: this
			}];
		}

		var schemalines = this.fun.getProof(hypnumMap, $Map, ctr);

		return [
			...schemalines,
			{
				_type: 'SE',
				ctr: ctr.next(),
				schema: schemalines[schemalines.length - 1].ctr,
				args: this.args,
				expr: this
			}
		];
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
					? `\\href{#def-${this.fun.name}}{\\htmlData{proved=${this.fun.isProved() ? 'p' : 'np'}}{\\textsf{${Expr.escapeTeX(this.fun.name)}}}}`
					: this.fun.toTeXString(false)
			) + `\\mathord{\\left(${this.args.map(arg => {
				return arg.toTeXString(Expr.PREC_COMMA);
			}).join(', ')}\\right)}`;
		}

		if (this.fun instanceof ObjectFun)
			return this.fun.funcallToTeXString(this.args, prec);
		
		var args = this.args.map(arg => {
			return arg.toTeXString(Expr.PREC_COMMA);
		});

		return (
			!(isNameable(this.fun) && this.fun.name) || this.fun instanceof Variable
				? this.fun.toTeXString(false)
				: Expr.makeTeXName(this.fun.name)
		) + `\\mathord{\\left(${args.join(', ')}\\right)}`;
	}
}

import Counter from '../Counter';
import ExecutionContext from '../ExecutionContext';
import { ProofType } from '../ProofType';
import StackTrace from '../StackTrace';
import $Variable from './$Variable';
import Fun from './Fun';
import { isNameable } from './Nameable';
import ObjectFun from './ObjectFun';
import Schema from './Schema';
import Variable from './Variable';
import { FunctionalMetaType, FunctionalObjectType } from './types';
