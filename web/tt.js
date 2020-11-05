function toTeX(parsed) {
	return (function recurse(tree) {
		if (typeof tree == 'string') return tree;

		if (['T', 'F'].includes(tree[0])) {
			return ({
				T: '\\top',
				F: '\\bot'
			})[tree[0]];
		}

		if (['N'].includes(tree[0])) {
			return ({
				N: function (args) {
					return `(\\neg ${recurse(args[0])})`;
				}
			})[tree[0]](tree.slice(1));
		}

		if (['A', 'O', 'I', 'E'].includes(tree[0])) {
			return ({
				A: function (args) {
					return `(${recurse(args[0])} \\land ${recurse(args[1])})`;
				},
				O: function (args) {
					return `(${recurse(args[0])} \\lor ${recurse(args[1])})`;
				},
				I: function (args) {
					return `(${recurse(args[0])} \\to ${recurse(args[1])})`;
				},
				E: function (args) {
					return `(${recurse(args[0])} \\leftrightarrow ${recurse(args[1])})`;
				},
			})[tree[0]](tree.slice(1));
		}

		throw Error();
	})(parsed);
}

function tt(name, type) {
	if (typeof name != 'string')
		throw Error('Assertion failed');

	var vars = ['p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
	var nullary = ['T', 'F'].concat(vars);
	var unary = ['N'];
	var binary = ['A', 'O', 'I', 'E'];

	var arityMap = {};
	nullary.forEach(e => arityMap[e] = 0);
	unary.forEach(e => arityMap[e] = 1);
	binary.forEach(e => arityMap[e] = 2);

	var usedVars = Array(vars.length).fill(false);

	// 1: 파싱 하기
	var stack = [];

	function lastIsFull() {
		if (!stack.length) return true;
		return arityMap[stack[stack.length - 1][0]] == stack[stack.length - 1].length - 1;
	}

	function push(token) {
		if (arityMap[token] == 0) {
			if (vars.includes(token))
				usedVars[vars.indexOf(token)] = true;

			if (lastIsFull()) {
				stack.push(token);
			} else {
				stack[stack.length - 1].push(token);

				while (stack.length > 1 && lastIsFull()
						&& (stack[stack.length - 2] instanceof Array)) {
					var p = stack.pop();
					stack[stack.length - 1].push(p);
				}
			}
		} else {
			stack.push([token]);
		}
	}

	for (var i = 0; i < name.length; i++) {
		if (typeof arityMap[name[i]] != 'number')
			throw Error(`Unexpected character ${name[i]}`);

		push(name[i]);
	}

	if (stack.length != 1)
		throw Error('Parse failed');

	if (!lastIsFull())
		throw Error('Parse failed');

	usedVars = usedVars.map((e, i) => e && i).filter(e => e !== false);

	var parsed = stack[0];

	// 2: 진리표 확인
	var collen = 2 ** usedVars.length;

	var functionMap = {
		N: p => !p,
		A: (p, q) => p && q,
		O: (p, q) => p || q,
		I: (p, q) => !p || q,
		E: (p, q) => p == q
	};

	var varTable = {};

	for (var i = 0; i < usedVars.length; i++) {
		varTable[vars[usedVars[i]]] = Array(collen).fill().map((_, j) => {
			return !((j >> (usedVars.length - i - 1)) & 1);
		});
	}

	var constTable = {
		T: Array(collen).fill(true),
		F: Array(collen).fill(false)
	};

	function getColumn(t) {
		if (t instanceof Array) {
			var columns = t.slice(1).map(getColumn);

			var column = Array(collen);

			for (var i = 0; i < collen; i++) {
				column[i] = functionMap[t[0]](...columns.map(col => col[i]));
			}

			return column;
		}

		if (['T', 'F'].includes(t)) return constTable[t];
		return varTable[t];
	}

	function makeTable(t) {
		if (t instanceof Array) {
			var children = t.slice(1).map(makeTable);
			var columns = children.map(child => child instanceof Array ? child[0].column : child.column);

			var column = Array(collen);

			for (var i = 0; i < collen; i++) {
				column[i] = functionMap[t[0]](...columns.map(col => col[i]));
			}

			return [{
				name: t[0],
				column
			}].concat(children);
		}

		if (['T', 'F'].includes(t)) return {
			name: t,
			column: constTable[t]
		};

		return {
			name: t,
			column: varTable[t]
		};
	}

	switch (type) {
		case 'verbose':
			var table = {
				left: Object.keys(varTable).sort().map(e => ({name: e, column: varTable[e]})),
				right: [makeTable(parsed)].flat(Infinity)
			};

			var a1 = table.right[0].column,
				a2 = getColumn(parsed);

			if (a1.length != a2.length || !a1.every((e, i) => e === a2[i])) {
				throw Error('Assertion failed!');
			}

			var tex = toTeX(parsed);

			return {
				table,
				tex
			};
		default:
			return getColumn(parsed).every(e => e);
	}
}