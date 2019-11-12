/*
 * PEG.js의 출력과 적절한 클래스 사이를 잇는 인터페이스.
 */

var Type = require('./nodes/Type');
var Typevar = require('./nodes/Typevar');
var Fun = require('./nodes/Fun');
var Funcall = require('./nodes/Funcall');
var Rule = require('./nodes/Rule');
var Yield = require('./nodes/Yield');
var Rulecall = require('./nodes/Rulecall');
var Ruleset = require('./nodes/Ruleset');
var Link = require('./nodes/Link');

var PegInterface = {};

PegInterface.type = function (obj, parentScope) {
	return new Type({
		functional: false,
		name: obj.name
	});
};

PegInterface.typevar = function (obj, parentScope) {
	var scope = parentScope.extend();

	if (!scope.hasType(obj.type))
		throw Error(`Type ${obj.type} not found`);

	var type = scope.getType(obj.type);

	return new Typevar({
		type,
		name: obj.name
	});
}

PegInterface.fun = function (obj, parentScope) {
	var anonymous = null;
	var name = null;
	var type = null;
	var atomic = null;
	var params = null;
	var expr = null;
	var scope = parentScope.extend();

	switch (obj._type) {
		case 'defun':
			anonymous = false;
			name = obj.name;

			if (!scope.hasType(obj.rettype))
				throw Error(`Rettype ${Type.getType(obj.rettype)} not found`);

			var rettype = scope.getType(obj.rettype);

			params = obj.params.map(tvo => {
				if (!scope.hasType(tvo.type))
					throw Error(`Param type ${Type.getType(tvo.type)} not found`);

				if (scope.hasOwnTypevarByName(tvo.name))
					throw Error(`Param name ${tvo.name} already is there`);

				return scope.addTypevar(tvo);
			});

			type = new Type({
				functional: true,
				from: params.map(typevar => typevar.type),
				to: rettype
			});

			atomic = !obj.expr;

			if (obj.expr) {
				switch (obj.expr._type) {
					case 'funcall':
						var funcall = PegInterface.funcall(obj.expr, scope);
						if (!rettype.equals(funcall.type))
							throw Error(`Return type mismatch: ${rettype}, ${funcall.type}`);
						expr = funcall;
						break;
					case 'funexpr':
						var fun = PegInterface.fun(obj.expr, scope);
						if (!rettype.equals(fun.type))
							throw Error(`Return type mismatch: ${rettype}, ${fun.type}`);
						expr = fun;
						break;
					case 'var':
						if (!scope.hasTypevarByName(obj.expr.name))
							throw Error(`Undefined identifier ${obj.expr.name}`);
						var typevar = scope.getTypevarByName(obj.expr.name);
						if (!rettype.equals(typevar.type)) {
							throw Error(`Wrong return type ${rettype}`);
						}
						expr = typevar;
						break;
					default:
						throw Error(`Unknown type ${obj.expr._type}`);
				}
			}
			break;
		case 'funexpr':
			anonymous = true;

			params = obj.params.map(tvo => {
				if (!scope.hasType(tvo.type))
					throw Error(`Param type ${Type.getType(tvo.type)} not found`);

				if (scope.hasOwnTypevarByName(tvo.name))
					throw Error(`Param name ${tvo.name} already is there`);

				return scope.addTypevar(tvo);
			});

			atomic = false;

			var rettype;

			switch (obj.expr._type) {
				case 'funcall':
					var funcall = PegInterface.funcall(obj.expr, scope);
					rettype = funcall.type;
					expr = funcall;
					break;
				case 'funexpr':
					var fun = PegInterface.fun(obj.expr, scope);
					rettype = fun.type;
					expr = fun;
					break;
				case 'var':
					if (!scope.hasTypevarByName(obj.expr.name))
						throw Error(`Undefined identifier ${obj.expr.name}`);
					var typevar = scope.getTypevarByName(obj.expr.name);
					rettype = typevar.type;
					expr = typevar;
					break;
				default:
					throw Error(`Unknown type ${obj.expr._type}`);
			}

			type = new Type({
				functional: true,
				from: params.map(typevar => typevar.type),
				to: rettype
			});

			break;
		default:
			throw Error(`Unknown type ${obj._type}`);
			break;
	}

	return new Fun({anonymous, name, type, atomic, params, expr});
};

PegInterface.funcall = function (obj, parentScope) {
	var fun = null;
	var args = null;
	var scope = parentScope.extend();

	switch (obj.fun._type) {
		case 'funcall':
			var funcall = PegInterface.funcall(obj.fun, scope);
			fun = funcall;
			break;
		case 'funexpr':
			fun = PegInterface.fun(obj.fun, scope);
			break;
		case 'var':
			if (!scope.hasTypevarByName(obj.fun.name))
				throw Error(`Undefined identifier ${obj.fun.name}`);
			fun = scope.getTypevarByName(obj.fun.name);
			if (fun.type.isSimple)
				throw Error(`${fun.name} is not callable`);
			break;
		default:
			throw Error(`Unknown type ${fun._type}`);
	}

	args = obj.args.map((arg, i) => {
		switch (arg._type) {
			case 'funcall':
				return PegInterface.funcall(arg, scope);
			case 'funexpr':
				return PegInterface.fun(arg, scope);
			case 'var':
				if (!scope.hasTypevarByName(arg.name))
					throw Error(`Undefined identifier ${arg.name}`);
				return scope.getTypevarByName(arg.name);
			default:
				throw Error(`Unknown type ${obj.expr._type}`);
		}
	});

	if (args.length != fun.type.from.length)
		throw Error(`Invalid number of arguments: ${obj.args.length}`);

	for (var i = 0; i < args.length; i++)
		if (!args[i].type.equals(fun.type.from[i]))
			throw Error(`Argument type mismatch: ${args[i].type}, ${fun.type.from[i]}`);

	return new Funcall({fun, args});
};

PegInterface.rule = function (obj, parentScope) {
	var scope = parentScope.extend();

	var name = obj.name;
	var params = obj.params.map(tvo => {
		if (!scope.hasType(tvo.type))
			throw Error(`Param type ${Type.getType(tvo.type)} not found`);

		if (scope.hasOwnTypevarByName(tvo.name))
			throw Error(`Param name ${tvo.name} already is there`);

		return scope.addTypevar(tvo);
	});

	var foo = obj => {
		switch (obj._type) {
			case 'yield':
				return PegInterface.yield(obj, scope);
			case 'rulecall':
				return PegInterface.rulecall(obj, scope);
			default:
				throw Error(`Unknown type ${obj._type}`);
		}
	};

	var rules = obj.rules.map(foo);

	return new Rule({name, params, rules});
};

PegInterface.yield = function (obj, parentScope) {
	var scope = parentScope.extend();

	var foo = obj => {
		switch (obj._type) {
			case 'funcall':
				var funcall = PegInterface.funcall(obj, scope);
				if (!scope.root.getTypeByName('st').equals(funcall.type))
					throw Error(`Return type is not st: ${funcall.type}`);
				return funcall;
			case 'funexpr':
				var fun = PegInterface.fun(obj, scope);
				if (!scope.root.getTypeByName('st').equals(fun.type))
					throw Error(`Return type is not st: ${fun.type}`);
				return fun;
			case 'var':
				if (!scope.hasTypevarByName(obj.name))
					throw Error(`Undefined identifier ${obj.name}`);
				var typevar = scope.getTypevarByName(obj.name);
				if (!scope.root.getTypeByName('st').equals(typevar.type)) {
					throw Error(`Return type is not st: ${typevar.type}`);
				}
				return typevar;
			default:
				throw Error(`Unknown type ${obj._type}`);
		}
	};

	var left = obj.left.map(foo);
	var right = foo(obj.right);

	return new Yield({left, right});
}

function rulenameObjToString(obj) {
	switch (obj.type) {
		case 'link':
			return `${obj.linkName}[${rulenameObjToString(obj.rule)}]`;
		case 'ruleset':
			return `${obj.rulesetName}.${obj.name}`;
		case 'normal':
			return `${obj.name}`;
		default:
			throw Error(`Unknown type ${obj.type}`);
	}
}

PegInterface.rulecall = function (obj, parentScope) {
	var scope = parentScope.extend();

	var rule = (function getRule(obj) {
		switch (obj.type) {
			case 'link':
				if (!scope.hasLinkByName(obj.linkName))
					throw Error(`Link ${obj.linkName} is not defined`);

				var link = scope.getLink(obj.linkName);

				var rule_ = getRule(obj.rule);

				var rule = link.code.get([rule_], scope);

				if (!rule)
					throw Error(`Rule ${rulenameObjToString(obj)} not found`);

				return rule;
			case 'ruleset':
				if (!scope.hasRulesetByName(obj.rulesetName))
					throw Error(`Ruleset ${obj.rulesetName} is not defined`);

				var ruleset = scope.getRuleset(obj.rulesetName);

				var rule = ruleset.code.get(obj.name, scope);

				if (!rule)
					throw Error(`Rule ${rulenameObjToString(obj)} not found`);
				
				return rule;
			case 'normal':
				if (!scope.hasRuleByName(obj.name))
					throw Error(`Rule ${obj.name} is not defined`);

				return scope.getRule(obj.name);
			default:
				throw Error(`Unknown type ${obj.type}`);
		}
	})(obj.rule);

	if (rule.params.length != obj.args.length)
		throw Error(`Invalid number of arguments: ${obj.args.length}`);

	var foo = obj => {
		switch (obj._type) {
			case 'funcall':
				var funcall = PegInterface.funcall(obj, scope);
				return funcall;
			case 'funexpr':
				var fun = PegInterface.fun(obj, scope);
				return fun;
			case 'var':
				if (!scope.hasTypevarByName(obj.name))
					throw Error(`Undefined identifier ${obj.name}`);
				var typevar = scope.getTypevarByName(obj.name);
				return typevar;
			default:
				throw Error(`Unknown type ${obj._type}`);
		}
	};

	return new Rulecall({
		rule,
		args: obj.args.map(foo)
	});
}

PegInterface.ruleset = function (obj, parentScope, nativeMap) {
	var scope = parentScope.extend();

	var name = obj.name;

	if (!obj.native)
		throw Error('Assertion failed');

	if (!nativeMap.ruleset[name])
		throw Error(`Native code for native ruleset ${name} not found`);

	var nativeCode = nativeMap.ruleset[name];

	return new Ruleset({name, code: nativeCode});
}

PegInterface.link = function (obj, parentScope, nativeMap) {
	var scope = parentScope.extend();

	var name = obj.name;

	if (!obj.native)
		throw Error('Assertion failed');

	if (!nativeMap.link[name])
		throw Error(`Native code for native link ${name} not found`);

	var nativeCode = nativeMap.link[name];

	return new Link({name, code: nativeCode});
}

module.exports = PegInterface;