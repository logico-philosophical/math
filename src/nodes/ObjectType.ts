import Nameable from './Nameable';
import Node from './Node';
import Type from './Type';

export default class ObjectType extends Type implements Nameable {

	public readonly name: string;
	public readonly origin: ObjectType;
	public readonly from: ObjectType[];
	public readonly to: ObjectType;

	constructor (o) {
		if (o.origin) {
			super(null, o.doc, null, o.origin.isFunctional);

			if (typeof o.name != 'string')
				throw Node.error('typeof o.name != \'string\'', null);
			this.name = o.name;

			if (!(o.origin instanceof ObjectType))
				throw Node.error('!(o.origin instanceof ObjectType)', null);

			this.origin = o.origin;
		} else {
			super(null, o.doc, null, o.functional);

			if (typeof o.functional != 'boolean')
				throw Node.error('typeof o.functional != \'boolean\'', null);

			if (!o.functional) {
				if (typeof o.name != 'string')
					throw Node.error('typeof o.name != \'string\'', null);
				this.name = o.name;
			} else {
				if (o.from.map(f => f instanceof ObjectType).some(e => !e))
					throw Node.error('o.from.map(f => f instanceof ObjectType).some(e => !e)', null);
				if (!(o.to instanceof ObjectType))
					throw Node.error('!(o.to instanceof ObjectType)', null);

				this.from = o.from;
				this.to = o.to;
			}
		}
	}

	public toSimpleString() {
		if (this.name) return this.name;

		var resolved = this.resolve();

		return `[${resolved.from.map(e => e.toSimpleString()).join(', ')} -> ${resolved.to.toSimpleString()}]`;
	}

	public toIndentedString(indent): string {
		if (this.isSimple) return this.name;

		return `${this.name ? this.name + ': ' : ''}[${this.resolve().from.join(', ')} -> ${this.resolve().to}]`;
	}

	public toTeXString(root?: boolean) {
		if (this.isSimple) return `\\href{#type-${this.name}}\\mathsf{${this.name}}`;

		if (!root && this.name) {
			return `\\href{#type-${this.name}}\\mathsf{${this.name}}`;
		}

		return `${this.name ? `\\href{#type-${this.name}}\\mathsf{${this.name}}: ` : ''}`
			+ `\\left[${this.resolve().from.map(e => e.toTeXString()).join(' \\times ')}`
			+ ` \\to ${this.resolve().to.toTeXString()} \\right]`;
	}

	public resolve(): ObjectType {
		return this.origin ? this.origin.resolve() : this;
	}

	public equals(t: Type): boolean {
		if (!(t instanceof ObjectType)) return false;

		if (this.origin) return this.origin.equals(t);
		if (t.origin) return this.equals(t.origin);

		if (this.isSimple != t.isSimple) return false;

		if (this.isSimple) return this === t;

		if (this.from.length != t.from.length) return false;

		for (var i = 0; i < this.from.length; i++)
			if (!this.from[i].equals(t.from[i])) return false;

		return this.to.equals(t.to);
	}
}