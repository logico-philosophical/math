import { Def$Object, DefvObject, Expr0Object, ImportOrLineObject, MetaexprObject, StypeObject, TypeObject } from "./PegInterfaceDefinitions";

export default function unparse(tree: ImportOrLineObject[]) {
	var strings = tree.map(line => recurse(line, Context.NORMAL, 0));

	var ret = '';

	for (var i = 0; i < strings.length; i++) {
		if (i != 0) {
			ret += tree[i - 1]._type == 'import' && tree[i]._type == 'import'
				? '\n' : '\n\n';
		}

		ret += strings[i];
	}

	return ret;
}

enum Context {
	CALLEE, TEELEFT, REDUCTIONRIGHT, REDUCTIONLEFT, NORMAL
}

function isOneLiner(s: string) {
	return s.indexOf('\n') < 0 && s.length <= 80;
}

function recurse(
		line: ImportOrLineObject | Def$Object | MetaexprObject | Expr0Object | TypeObject,
		context: Context,
		indent: number): string {
	return recurseInternal(line, context)
		.replace(/\n/g, '\n' + '\t'.repeat(indent))
		.replace(/(?<=\n)\s+(?=\n)/g, '');
}

function recurseInternal(
		line: ImportOrLineObject | Def$Object | MetaexprObject | Expr0Object | TypeObject,
		context: Context): string {
	
	function defv(line: DefvObject, param: boolean) {
		/* export interface DefvObject {
			_type: 'defv';
			isParam: boolean;
			selector?: string;
			doc: string;
			tex: string;
			sealed?: boolean;
			type: TypeObject;
			name: string;
			expr?: Expr0Object;
			location: LocationObject;
		} */
		var s = param ? ' ' : '\n';
		return `${
	line.doc ? `"${line.doc}"` + s : ''
}${
	line.tex ? `$${line.tex}$` + s : ''
}${line.sealed ? 'sealed ' : ''}${recurse(line.type, Context.NORMAL, 0)} ${line.name}${
	line.selector ? ': @' + line.selector : ''
}${
	line.expr ? ' = ' + recurse(line.expr, Context.NORMAL, 0) : ''
}${param ? '' : ';'}`;
	}

	switch (line._type) {
		case 'defschema':
			/* export interface DefschemaObject {
				_type: 'defschema';
				doc: string;
				annotations: string[];
				schemaType: SchemaType,
				name: string;
				params: DefvObject[];
				using: string[];
				def$s: Def$Object[];
				expr: MetaexprObject;
				location: LocationObject;
			} */
			return `${
	line.doc ? `"${line.doc}"\n` : ''
}${
	line.annotations.map(a => a + ' ').join('')
}${line.schemaType} ${line.name}(${
	line.params.map(param => recurse(param, Context.NORMAL, 0)).join(', ')
})${line.using.length ? ' using ' + line.using.join(', ') : ''} {
	${line.def$s.map(def$ => recurse(def$, Context.NORMAL, 1) + '\n\n\t').join('')}${
		recurse(line.expr, Context.NORMAL, 1)
	}
}`;
		case 'defun':
			/* export interface DefunObject {
				_type: 'defun';
				doc: string;
				tex: string;
				sealed: boolean;
				rettype: TypeObject;
				name: string;
				params: DefvObject[];
				expr: Expr0Object;
				location: LocationObject;
			} */
			return `${
	line.doc ? `"${line.doc}"\n` : ''
}${
	line.tex ? `$${line.tex}$\n` : ''
}${line.sealed ? 'sealed ' : ''}${recurse(line.rettype, Context.NORMAL, 0)} ${line.name}(${
	line.params.map(param => recurse(param, Context.NORMAL, 0)).join(', ')
})${
	line.expr
		? ` {
	${recurse(line.expr, Context.NORMAL, 1)}
}`
		: ';'
}`;
		case 'defv':
			return defv(line, line.isParam);
		case 'import':
			/* export interface ImportObject {
				_type: 'import';
				filename: string;
				location: LocationObject;
			} */
			return `import ${line.filename};`;
		case 'typedef':
			/* export interface TypedefObject {
				_type: 'typedef';
				doc: string;
				origin?: FtypeObject;
				name: string;
				location: LocationObject;
			} */
			return `${
	line.doc ? `"${line.doc}"\n` : ''
}type ${line.name}${
	line.origin ? ' = ' + recurse(line.origin, Context.NORMAL, 0) : ''
};`;
		case 'def$':
			/* export interface Def$Object {
				_type: 'def$';
				name: string;
				expr: MetaexprObject;
				location: LocationObject;
			} */
			return `${line.name} = ${recurse(line.expr, Context.NORMAL, 0)};`;
		case 'tee':
			/* export interface TeeObject {
				_type: 'tee';
				left: MetaexprObject[];
				def$s: Def$Object[];
				right: MetaexprObject;
				location: LocationObject;
			} */
			if (context <= Context.TEELEFT)
				return '(' + recurse(line, Context.NORMAL, 0) + ')';
			
			var left = !line.left.length
				? ''
				: line.left.map(left => recurse(left, Context.TEELEFT, 0))
					.reduce((l, r) => {
						if (!isOneLiner(r)) return l + ',\n' + r;

						var lastLine = l.lastIndexOf('\n') < 0
							? l
							: l.substring(l.lastIndexOf('\n') + 1);
						
						if (isOneLiner(lastLine + ', ' + r)) return l + ', ' + r;

						return l + ',\n' + r;
					});
			var def$s = line.def$s.map(def$ => recurse(def$, Context.NORMAL, 1));
			var right = recurse(line.right, Context.NORMAL, 1);

			var oneline = !def$s.length && isOneLiner(right);
			var needBraces = !oneline || !(
				['tee', 'schemacall', 'var', 'schemaexpr'].includes(line.right._type)
			);
			if (needBraces) oneline = false;

			var braces = !needBraces
				? ['', '']
				: oneline
					? ['{ ', ' }']
					: ['{\n\t', '\n}'];
			
			return `${left} |- ${braces[0]}${
				def$s.map(d => d + '\n\n\t').join('')
			}${right}${braces[1]}`;
		case 'reduction':
			/* export interface ReductionObject {
				_type: 'reduction';
				subject: MetaexprObject;
				args: Array<Expr0Object | null>;
				antecedents: MetaexprObject[];
				as: MetaexprObject;
				location: LocationObject;
			} */
			if (context <= Context.REDUCTIONRIGHT)
				return '(' + recurse(line, Context.NORMAL, 0) + ')';
			
			var left = !line.antecedents.length
				? ''
				: line.antecedents.map(left => recurse(left, Context.REDUCTIONLEFT, line.antecedents.length == 1 ? 0 : 1))
					.reduce((l, r) => {
						if (!isOneLiner(r) || (l + r).indexOf(' > ') >= 0) return l + ';\n\t' + r;

						var lastLine = l.lastIndexOf('\n') < 0
							? l
							: l.substring(l.lastIndexOf('\n') + 1);
						
						if (isOneLiner(lastLine + '; ' + r)) return l + '; ' + r;

						return l + ';\n\t' + r;
					});
			var brackets = line.antecedents.length == 1
				? ['', '']
				: isOneLiner(left)
					? ['[', ']']
					: ['[\n\t', '\n]'];
			
			return `${brackets[0]}${left}${brackets[1]} > ${recurse(line.subject, Context.CALLEE, 0)}${
				!line.args
					? ''
					: `(${line.args.map(arg => !arg ? '?' : recurse(arg, Context.NORMAL, 0)).join(', ')})`
			}${line.as ? ' as ' + recurse(line.as, Context.REDUCTIONRIGHT, 0) : ''}`;
		case 'schemacall':
		case 'funcall':
			/* export interface SchemacallObject {
				_type: 'schemacall';
				schema: MetaexprObject;
				args: Expr0Object[];
				location: LocationObject;
			} */

			/* export interface FuncallObject {
				_type: 'funcall';
				schema: Expr0Object;
				args: Expr0Object[];
				location: LocationObject;
			} */
			var brackets = ['var'].includes(line.schema._type)
				? ['', '']
				: ['(', ')'];

			return `${brackets[0]}${recurse(line.schema, Context.CALLEE, 0)}${brackets[1]}(${
				line.args.map(arg => recurse(arg, Context.NORMAL, 0)).join(', ')
			})`;
		case 'with':
			/* export interface WithObject {
				_type: 'with';
				with: DefvObject;
				def$s: Def$Object[];
				expr: MetaexprObject;
				location: LocationObject;
			} */
			return `with (${defv(line.with, true)}) {
	${line.def$s.map(def$ => recurse(def$, Context.NORMAL, 1) + '\n\n\t').join('')}${
		recurse(line.expr, Context.NORMAL, 1)
	}
}`;
		case 'var':
			/* export interface VarObject {
				_type: 'var';
				type: '@' | '$' | 'normal';
				name: string;
				location: LocationObject;
			} */
			switch (line.type) {
				case '@': return '@' + line.name;
				case '$': return line.name;
				default: return line.name;
			}
		case 'schemaexpr':
		case 'funexpr':
			/* export interface SchemaexprObject {
				_type: 'schemaexpr';
				params: DefvObject[];
				def$s: Def$Object[];
				expr: MetaexprObject;
				location: LocationObject;
			} */

			/* export interface FunexprObject {
				_type: 'funexpr';
				params: DefvObject[];
				expr: Expr0Object;
				location: LocationObject;
			} */
			if (context == Context.CALLEE)
				return recurse(line, Context.NORMAL, 0);
			
			var def$s = line._type == 'funexpr'
				? []
				: line.def$s.map(def$ => recurse(def$, Context.NORMAL, 1));
			var expr = recurse(line.expr, Context.NORMAL, 1);

			var oneline = !def$s.length && isOneLiner(expr);
			var needBraces = !oneline || !(
				['schemacall', 'funcall', 'var', 'schemaexpr', 'funexpr'].includes(line.expr._type)
			);

			var braces = !needBraces
				? ['', '']
				: oneline
					? ['{ ', ' }']
					: ['{\n\t', '\n}'];
			
			return `(${
				line.params.map(param => recurse(param, Context.NORMAL, 0)).join(', ')
			}) => ${braces[0]}${
				def$s.map(d => d + '\n\n\t').join('')
			}${expr}${braces[1]}`;
		case 'type':
			if (line.ftype) {
				/* export interface FtypeObject {
					_type: 'type';
					ftype: true;
					from: TypeObject[];
					to: TypeObject;
					location: LocationObject;
				} */
				var from = line.from.map(f => recurse(f, Context.NORMAL, 0)).join(', ');
				return `[${from} -> ${recurse(line.to, Context.NORMAL, 0)}]`;
			} else  {
				/* export interface StypeObject {
					_type: 'type';
					ftype: false;
					name: string;
					location: LocationObject;
				} */
				return (line as StypeObject).name;
			}
		default:
			throw Error('Unhandled type ' + (line as any)._type);
	}
}