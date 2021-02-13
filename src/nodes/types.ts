import StackTrace from "../StackTrace";
import Nameable from "./Nameable";

export abstract class Type {

	public readonly trace: StackTrace;
	public readonly doc: string;

	constructor (doc: string, trace: StackTrace) {
		this.doc = doc;
		this.trace = trace;
	}

	public abstract resolve(): Type;

	public toString() {
		return this.toIndentedString(0);
	}

	public abstract toIndentedString(indent: number): string;

	public abstract isFunctional(): boolean;

	public equals(t: Type): boolean {
		if (this === t) return true;

		if (!(t instanceof Type)) return false;

		if ((this instanceof TeeType) != (t instanceof TeeType)) {
			return false;
		}

		if (this instanceof TeeType && t instanceof TeeType) {
			if (this.left.length != t.left.length) return false;

			for (var i = 0; i < this.left.length; i++) {
				if (!this.left[i].equals(t.left[i])) return false;
			}

			return this.right.equals(t.right);
		}

		if (this instanceof SimpleObjectType && this.expr) {
			return this.expr.equals(t);
		}

		if (t instanceof SimpleObjectType && t.expr) {
			return this.equals(t.expr);
		}

		if (this instanceof SimpleObjectType || t instanceof SimpleObjectType) {
			return false;
		}

		if ((this instanceof FunctionalObjectType || this instanceof FunctionalMetaType)
				&& (t instanceof FunctionalObjectType || t instanceof FunctionalMetaType)) {
			if (this.from.length != t.from.length) return false;

			for (var i = 0; i < this.from.length; i++) {
				if (!this.from[i].equals(t.from[i])) return false;
			}

			return this.to.equals(t.to);
		}

		throw Error('Unknown type format');
	}
}

interface TeeTypeArgumentType {
	left: Type[];
	right: Type;
}

export class TeeType extends Type {

	public readonly left: Type[];
	public readonly right: Type;

	constructor ({left, right}: TeeTypeArgumentType, trace: StackTrace) {
		super(null, trace);

		if (!left || !right) {
			throw Error('duh');
		}

		this.left = left;
		this.right = right;
	}

	public toIndentedString(indent: number): string {
		return `[${this.left.join(', ')} |- ${this.right}]`;
	}

	public resolve(): Type {
		return this;
	}

	public isFunctional(): boolean {
		return false;
	}
}

interface FunctionalMetaTypeArgumentType {
	from: ObjectType[];
	to: Type;
}

export class FunctionalMetaType extends Type {
	
	public readonly from: ObjectType[];
	public readonly to: Type;

	constructor ({from, to}: FunctionalMetaTypeArgumentType, trace: StackTrace) {
		super(null, trace);

		if (!from || !to) {
			throw Error('duh');
		}

		this.from = from;
		this.to = to;
	}

	public toIndentedString(indent: number): string {
		return `[${this.from.join(', ')} -> ${this.to}]`;
	}

	public resolve(): FunctionalMetaType {
		return this;
	}

	public isFunctional(): boolean {
		return true;
	}
}

export abstract class ObjectType extends Type {

	constructor (doc: string, trace: StackTrace) {
		super(doc, trace);
	}

	public abstract resolve(): ObjectType;

	public abstract toTeXString(root?: boolean): string;
}

interface SimpleObjectTypeArgumentType {
	doc: string;
	name: string;
	expr: ObjectType;
}

export class SimpleObjectType extends ObjectType implements Nameable {

	public readonly name: string;
	public readonly expr: ObjectType;

	constructor ({doc, name, expr}: SimpleObjectTypeArgumentType, trace: StackTrace) {
		super(doc, trace);

		if (!name) throw Error('duh');

		this.name = name;
		this.expr = expr;
	}

	public resolve(): ObjectType {
		return this.expr ? this.expr.resolve() : this;
	}

	public toIndentedString(indent: number): string {
		return this.name;
	}

	public toTeXString(root?: boolean): string {
		var name = `\\href{#type-${this.name}}{\\mathsf{${this.name}}}`;

		if (root && this.expr) {
			return name + `\\coloneqq${this.expr.toTeXString()}`;
		}

		return name;
	}

	public isFunctional(): boolean {
		if (this.expr) return this.expr.isFunctional();

		return false;
	}
}

interface FunctionalObjectTypeArgumentType {
	from: ObjectType[];
	to: ObjectType;
}

export class FunctionalObjectType extends ObjectType {

	public readonly from: ObjectType[];
	public readonly to: ObjectType;

	constructor ({from, to}: FunctionalObjectTypeArgumentType, trace: StackTrace) {
		super(null, trace);

		this.from = from;
		this.to = to;
	}

	public resolve(): FunctionalObjectType {
		return new FunctionalObjectType({
			from: this.from.map(f => f.resolve()),
			to: this.to.resolve()
		}, this.trace);
	}

	public toIndentedString(indent: number): string {
		return `[${this.from.join(', ')} -> ${this.to}]`;
	}

	public toTeXString(root?: boolean): string {
		return `\\left[${this.from.map(e => e.toTeXString()).join('\\times ')}`
			+ ` \\to ${this.to.toTeXString()}\\right]`;
	}

	public isFunctional(): boolean {
		return true;
	}
}