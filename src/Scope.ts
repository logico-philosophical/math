import Type from './nodes/Type';
import Typevar from './nodes/Typevar';
import Schema from './nodes/Schema';

import StackTrace from './StackTrace';
import { Metaexpr } from './ExpressionResolver';
import $var from './nodes/$var';

export type NestedTypeInput = string | NestedTypeInput[];

export default class Scope {
	public readonly typedefMap: Map<string, Type> = new Map();
	public readonly defMap: Map<string, Typevar | Schema> = new Map();
	public readonly schemaMap: Map<string, Schema> = new Map();
	public readonly $Map: Map<string, $var> = new Map();
	public readonly hypotheses: Metaexpr[] = [];

	public readonly parent: Scope;
	public readonly root: Scope;

	public readonly trace: StackTrace;
	public baseType: Type;

	constructor (parent: Scope, trace?: StackTrace) {
		this.parent = parent;
		this.root = parent ? parent.root : this;

		if (trace && !(trace instanceof StackTrace)) {
			throw Error('Assertion failed');
		}

		this.trace = trace || new StackTrace();

		this.baseType = parent ? parent.baseType : null;
	}

	public extend(type, name, location): Scope {
		var child = new Scope(this, this.trace.extend(type, name, location));
		this.hypotheses.forEach(h => child.hypotheses.push(h));
		return child;
	}

	public error(message: string): Error {
		return this.trace.error(message);
	}

	/*
	 * Possible input values:
	 * 'st'						-> st
	 * ['cls', 'st']			-> [cls -> st]
	 * ['cls', 'cls', 'st']		-> [(cls, cls) -> st]
	 * [['cls', 'st'], 'st']	-> [[cls -> st] -> st]
	 */
	public hasOwnType(name: NestedTypeInput): boolean {
		if (typeof name == 'string') {
			return this.typedefMap.has(name);
		}

		if (!(name instanceof Array))
			throw this.error('Argument is malformed');

		if (name.length < 2)
			throw this.error('Illegal array length');

		return name.map(e => {
			return this.hasOwnType(e);
		}).every(e => e);
	}

	/*
	 * Possible input values:
	 * 'st'						-> st
	 * ['cls', 'st']			-> [cls -> st]
	 * ['cls', 'cls', 'st']		-> [(cls, cls) -> st]
	 * [['cls', 'st'], 'st']	-> [[cls -> st] -> st]
	 */
	public hasType(name: NestedTypeInput): boolean {
		if (typeof name == 'string') {
			return this.hasOwnType(name)
				|| (!!this.parent && this.parent.hasType(name));
		}

		if (!(name instanceof Array))
			throw this.error('Argument is malformed');

		if (name.length < 2)
			throw this.error('Illegal array length');

		return name.map(e => {
			return this.hasType(e);
		}).every(e => e);
	}

	public addType(type: Type): Type {
		if (!(type instanceof Type))
			throw this.error('Illegal argument type');

		if (!type.name)
			throw this.error('Something\'s wrong');

		if (this.hasOwnType(type.name))
			throw this.error(`Type ${type.name} has already been declared`);

		if (type.isBaseType) {
			if (this.baseType) {
				throw this.error('A base type already exists');
			}

			(function broadcast(scope: Scope) {
				scope.baseType = type;
				if (scope.parent) broadcast(scope.parent);
			})(this);
		}

		this.typedefMap.set(type.name, type);
		return type;
	}

	/*
	 * Possible input values:
	 * 'st'						-> st
	 * ['cls', 'st']			-> [cls -> st]
	 * ['cls', 'cls', 'st']		-> [(cls, cls) -> st]
	 * [['cls', 'st'], 'st']	-> [[cls -> st] -> st]
	 */
	public getType(name: NestedTypeInput): Type {
		if (typeof name == 'string') {
			if (!this.hasType(name))
				throw this.error(`Type ${name} is not defined`);

			return this.typedefMap.has(name)
				? this.typedefMap.get(name) : (!!this.parent && this.parent.getType(name));
		}

		if (!(name instanceof Array))
			throw this.error('Argument is malformed');

		if (name.length < 2)
			throw this.error('Illegal array length');

		var from = name.slice(0, name.length - 1).map(e => {
			return this.getType(e);
		});

		var to = this.getType(name[name.length - 1]);

		return new Type({
			functional: true,
			from,
			to
		});
	}

	public hasOwnTypevar(name: string): boolean {
		return this.defMap.has(name);
	}

	public hasTypevar(name: string): boolean {
		return this.hasOwnTypevar(name) ||
			(!!this.parent && this.parent.hasTypevar(name));
	}

	public addTypevar(typevar: Typevar | Schema): Typevar | Schema {
		if (!(typevar instanceof Typevar))
			throw this.error('Illegal argument type');

		if (this.hasOwnTypevar(typevar.name))
			throw this.error(`Definition ${typevar.name} has already been declared`);

		this.defMap.set(typevar.name, typevar);
		return typevar;
	}

	public addFun(fun: Schema): Schema {
		if (!(fun instanceof Schema))
			throw this.error('Illegal argument type');

		if (!fun.name)
			throw this.error('Cannot add anonymous fun to scope');

		if (this.hasOwnTypevar(fun.name))
			throw this.error(`Definition ${fun.name} has already been declared`);

		this.defMap.set(fun.name, fun);
		return fun;
	}

	public getTypevar(name: string): Typevar | Schema {
		if (!this.hasTypevar(name))
			throw this.error(`Definition ${name} is not defined`);

		return this.defMap.has(name)
			? this.defMap.get(name) : (!!this.parent && this.parent.getTypevar(name));
	}

	public hasOwnSchema(name: string): boolean {
		return this.schemaMap.has(name) || this.defMap.has(name);
	}

	public hasSchema(name: string): boolean {
		return this.hasOwnSchema(name)
			|| (!!this.parent && this.parent.hasSchema(name));
	}

	public addSchema(schema: Schema): Schema {
		if (!(schema instanceof Schema))
			throw this.error('Illegal argument type');

		if (this.hasOwnSchema(schema.name))
			throw this.error(`Schema ${schema.name} has already been declared`);

		this.schemaMap.set(schema.name, schema);
		return schema;
	}

	public getSchema(name: string): Typevar | Schema {
		if (!this.hasSchema(name))
			throw this.error(`Schema ${name} is not defined`);

		return this.schemaMap.has(name)
			? this.schemaMap.get(name)
			: this.defMap.has(name)
				? this.defMap.get(name)
				: (!!this.parent && this.parent.getSchema(name));
	}

	public hasOwn$(name: string): boolean {
		return this.$Map.has(name);
	}

	public has$(name: string): boolean {
		return this.hasOwn$(name)
			|| (!!this.parent && this.parent.has$(name));
	}

	public add$($: $var): $var {
		if (!($ instanceof $var))
			throw this.error('Illegal argument type');

		if (this.hasOwn$($.name))
			throw this.error(`$var ${$.name} has already been declared`);

		this.$Map.set($.name, $);
		return $;
	}

	public get$(name: string): $var {
		if (!this.has$(name))
			throw this.error(`$var ${name} is not defined`);

		return this.$Map.has(name)
			? this.$Map.get(name) : (!!this.parent && this.parent.get$(name));
	}
}