import Node from './Node';

export default class Type extends Node {
	public readonly _type = 'type';

	public readonly isBaseType: boolean;
	public readonly isFunctional: boolean;
	public readonly isSimple: boolean;
	public readonly name: string;
	public readonly origin: Type;
	public readonly from: Type[];
	public readonly to: Type;

	constructor (o) {
		super();

		this.doc = o.doc;
		this.isBaseType = !!o.base;

		if (o.origin) {
			if (typeof o.name != 'string')
				throw this.error('typeof o.name != \'string\'');
			this.name = o.name;

			if (!(o.origin instanceof Type))
				throw this.error('!(o.origin instanceof Type)');

			this.isFunctional = o.origin.isFunctional;
			this.isSimple = o.origin.isSimple;
			this.origin = o.origin;
		} else {
			if (typeof o.functional != 'boolean')
				throw this.error('typeof o.functional != \'boolean\'');
			this.isFunctional = o.functional;
			this.isSimple = !o.functional;

			if (!o.functional) {
				if (typeof o.name != 'string')
					throw this.error('typeof o.name != \'string\'');
				this.name = o.name;
			} else {
				if (o.from.map(f => f instanceof Type).some(e => !e))
					throw this.error('o.from.map(f => f instanceof Type).some(e => !e)');
				if (!(o.to instanceof Type))
					throw this.error('!(o.to instanceof Type)');

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

	public resolve(): Type {
		return this.origin ? this.origin.resolve() : this;
	}

	public equals(t: object): boolean {
		if (!(t instanceof Type)) return false;

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