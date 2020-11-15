import $Variable from "./nodes/$Variable";
import Expr0 from "./nodes/Expr0";
import Fun from "./nodes/Fun";
import Funcall from "./nodes/Funcall";
import Metaexpr from "./nodes/Metaexpr";
import { isNameable } from "./nodes/Nameable";
import ObjectFun from "./nodes/ObjectFun";
import Reduction from "./nodes/Reduction";
import Schema from "./nodes/Schema";
import Tee from "./nodes/Tee";
import Variable from "./nodes/Variable";
import { ProofExplorerIntermediateType } from "./ProofExplorerIntermediateType";
import Scope from "./Scope";

export default class ProofExplorer {
	public static get(scope: Scope, name: string, ktx): string {
		var DIAMOND = '&#x25C7;',
			DOWN = '&#x25BC;';
		// var UP = '&#x25B2;';
		
		if (!scope.hasSchema(name)) {
			throw Error('wut');
		}
	
		var theexpr = scope.getSchema(name);

		if (!(theexpr instanceof Schema)) {
			throw Error('wut');
		}

		function getHtmlLine(ctr: string | number, left: any[], h1: string, h2: string | string[], options?) {
			var padding = left.length;

			var {bbb=false, rrb=false} = options || {};
	
			var htmlLeft = left.map((e, i, a) => `<td class="${rrb && i == a.length - 1 ? 'rrb' : 'brb'}">${e.map(f => ktx(f.toTeXStringWithId(true))).join(', ')}</td>`).join('');

			for (var i = 0; i < left.length; i++)
				while(left[i].length) left[i].pop();
	
			return `<tr><th>${ctr}</th>${htmlLeft}<td ${bbb ? 'class="bbb" ' : ''}colspan="${ncols-padding}">${h1}</td>${h2 instanceof Array ? h2.map(e => `<td>${e}</td>`).join('') : `<td colspan="2">${h2}</td>`}</tr>`;
		}

		function exprToHtml(expr: number | [number, number] | Metaexpr, expand?: boolean): string {
			if (typeof expr == 'number') return `<b>${expr}</b>`;
			if (expr instanceof Array) return `<b>${expr[0]}&ndash;${expr[1]}</b>`;
			if (expand) return ktx(expr.expandMeta(true).toTeXString(true));
			
			return ktx(expr.toTeXString(true));
		}

		var ctr = 0;

		var tree = (function getTree(
				expr: Metaexpr,
				hypnumMap: Map<Metaexpr, number>,
				$Map: Map<Metaexpr, number | [number, number]>
			): ProofExplorerIntermediateType[] {
			
			if (hypnumMap.has(expr)) {
				return [{
					_type: 'R',
					ctr: ++ctr,
					num: hypnumMap.get(expr),
					expr
				}];
			}

			if ($Map.has(expr)) {
				return [{
					_type: 'R',
					ctr: ++ctr,
					num: $Map.get(expr),
					expr
				}];
			}

			if (expr instanceof Reduction) {
				var leftarglines: ProofExplorerIntermediateType[] = [];
				var leftargnums: (number | [number, number])[] = expr.leftargs.map(l => {
					if (hypnumMap.has(l)) return hypnumMap.get(l);
					if ($Map.has(l)) return $Map.get(l);

					var lines = getTree(l, hypnumMap, $Map);
					leftarglines = leftarglines.concat(lines);
					return lines[lines.length - 1].ctr;
				});
				
				var args: Expr0[] = null;
				var subjectlines: ProofExplorerIntermediateType[] = [];
				var subjectnum = hypnumMap.get(expr.subject)
					|| $Map.get(expr.subject)
					|| (expr.subject instanceof Funcall && $Map.has(expr.subject.fun)
						? (args = expr.subject.args, $Map.get(expr.subject.fun))
						: false)
					|| ((s => s instanceof Fun && s.name
							|| s instanceof Funcall && isNameable(s.fun) && s.fun.name)(expr.subject)
						? expr.subject
						: (subjectlines = getTree(expr.subject, hypnumMap, $Map))[subjectlines.length-1].ctr);

				return [
					...leftarglines,
					...subjectlines,
					{
						_type: 'E',
						ctr: ++ctr,
						subject: subjectnum,
						args,
						leftargs: leftargnums,
						reduced: expr.reduced
					}
				];
			} else if (expr instanceof Funcall) {
				if (hypnumMap.has(expr.fun)) {
					return [{
						_type: 'RC',
						ctr: ++ctr,
						schema: hypnumMap.get(expr.fun),
						args: expr.args,
						expr
					}];
				}

				if ($Map.has(expr.fun)) {
					return [{
						_type: 'RC',
						ctr: ++ctr,
						schema: $Map.get(expr.fun),
						args: expr.args,
						expr
					}];
				}

				if (expr.fun instanceof Schema && expr.fun.name) {
					return [{
						_type: 'RCX',
						ctr: ++ctr,
						expr
					}];
				}

				if (!(expr.fun instanceof Schema)) {
					return [{
						_type: 'NP',
						ctr: ++ctr,
						expr
					}];
				}

				var schemalines = getTree(expr.fun, hypnumMap, $Map);

				return [
					...schemalines,
					{
						_type: 'RC',
						ctr: ++ctr,
						schema: schemalines[schemalines.length - 1].ctr,
						args: expr.args,
						expr
					}
				];
			} else if (expr instanceof Variable) {
				return [{
					_type: 'NP',
					ctr: ++ctr,
					expr
				}];
			} else if (expr instanceof Fun) {
				if (expr instanceof Schema && expr.name && expr != theexpr) {
					return [{
						_type: 'RS',
						ctr: ++ctr,
						expr
					}];
				}

				if (!expr.expr) {
					return [{
						_type: 'NP',
						ctr: ++ctr,
						expr
					}];
				}

				$Map = new Map($Map);

				var start = ctr + 1;

				var $lines: ProofExplorerIntermediateType[] = [];
				
				if (expr instanceof Schema) {
					expr.def$s.forEach($ => {
						var lines = getTree($.expr, hypnumMap, $Map);
						$lines = $lines.concat(lines);

						var $num = lines[lines.length - 1].ctr;
						$Map.set($, $num);
					});
				}

				return [{
					_type: 'V',
					$lines,
					lines: getTree(expr.expr, hypnumMap, $Map),
					params: expr.params,
					ctr: [start ,ctr]
				}];
			} else if (expr instanceof Tee) {
				hypnumMap = new Map(hypnumMap);
				var leftlines = [];

				var start = ctr + 1;

				expr.left.forEach(l => {
					hypnumMap.set(l, ++ctr);
					leftlines.push({
						_type: 'H',
						ctr,
						expr: l
					});
				});

				$Map = new Map($Map);

				var $lines: ProofExplorerIntermediateType[] = [];
				expr.def$s.forEach($ => {
					var lines = getTree($.expr, hypnumMap, $Map);
					$lines = $lines.concat(lines);

					var $num = lines[lines.length - 1].ctr;
					$Map.set($, $num);
				});

				return [{
					_type: 'T',
					leftlines,
					$lines,
					rightlines: getTree(expr.right, hypnumMap, $Map),
					ctr: [start, ctr]
				}];
			} else if (expr instanceof $Variable) {
				if (!$Map.has(expr)) {
					throw Error(`${expr.name} is not defined`);
				}

				return [{
					_type: 'R',
					ctr: ++ctr,
					num: $Map.get(expr),
					expr: expr.expr
				}];
			} else {
				console.log('Unknown metaexpr', expr);
				return [{
					_type: '?',
					ctr: ++ctr,
					expr
				}];
			}
		})(theexpr, new Map(), new Map());

		var innertree: ProofExplorerIntermediateType[] = (tree[0] as any).$lines.concat((tree[0] as any).lines);

		var ncols = (function recurse(tree: ProofExplorerIntermediateType[]): number {
			return Math.max(...tree.map(t => {
				switch (t._type) {
					case 'V':
						return Math.max(
							recurse(t.$lines),
							recurse(t.lines)
						) + 1;
					case 'T':
						return Math.max(
							recurse(t.leftlines),
							recurse(t.$lines),
							recurse(t.rightlines)
						) + 1;
					default:
						return 1;
				}
			}));
		})(innertree);

		var html = '<table class="explorer">';
		html += `<tr><th>#</th><th colspan="${ncols}">expr</th><th colspan="2">rule</th></tr>`;
		
		html += (function tree2html(lines: ProofExplorerIntermediateType[], left: Variable[][]) {
			return lines.map(line => {
				switch (line._type) {
					case 'V':
						// getHtmlLine 함수가 이 배열을 조작하기 때문에
						// shallow copy 해야 한다.
						var params = line.params.slice();
						return tree2html(line.$lines, left.concat([params]))
							+ tree2html(line.lines, left.concat([params]));
					case 'T':
						var newleft = left.concat([[]]);

						var ret = '';

						if (line.leftlines.length == 0) {
							var emptyleft = Array(left.length + 1).fill([]);

							ret += getHtmlLine(
								'', emptyleft, '', '', {bbb: true, rrb: true}
							);
						} else {
							ret += line.leftlines.map((line, i, a) => {
								return getHtmlLine(
									line.ctr,
									newleft,
									exprToHtml(line.expr, true),
									'assumption',
									{bbb: i == a.length - 1, rrb: true}
								);
							}).join('');
						}

						ret += tree2html(
							line.$lines,
							newleft
						);

						ret += tree2html(
							line.rightlines,
							newleft
						);

						return ret;
					case '?':
						return getHtmlLine(
							line.ctr,
							left,
							exprToHtml(line.expr, true),
							'???'
						);
					case 'H':
						throw Error('no');
					case 'R':
						return getHtmlLine(
							line.ctr,
							left,
							exprToHtml(line.expr, true),
							[DIAMOND, exprToHtml(line.num)]
						);
					case 'RS':
					case 'RCX':
						return getHtmlLine(
							line.ctr,
							left,
							exprToHtml(line.expr, true),
							[DIAMOND, exprToHtml(line.expr)]
						);
					case 'RC':
						return getHtmlLine(
							line.ctr,
							left,
							exprToHtml(line.expr, true),
							[DIAMOND, `${exprToHtml(line.schema)} (${line.args.map(a => exprToHtml(a)).join(', ')})`]
						);
					case 'E':
						return getHtmlLine(
							line.ctr,
							left,
							exprToHtml(line.reduced, true),
							[DOWN, `${exprToHtml(line.subject)}${line.args ? ' (' + line.args.map(a => exprToHtml(a)).join(', ') + ')' : ''} [${line.leftargs.map(a => exprToHtml(a)).join(', ')}]`]
						);
					case 'NP':
						return getHtmlLine(
							line.ctr,
							left,
							exprToHtml(line.expr, true),
							'<b class="red">not proved</b>'
						);
					default:
						return getHtmlLine(
							(line as any).ctr,
							left,
							`Unknown type ${(line as any)._type}`,
							''
						);
				}
			}).join('');
		})(innertree, []);
		
		html += '</table>';
	
		return html;
	}
}