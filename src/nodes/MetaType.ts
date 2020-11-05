import Node, { Precedence } from './Node';
import ObjectType from './ObjectType';
import Type from './Type';

interface SimpleMetaTypeArgumentType {
	functional: false;
	left: Type[];
	right: Type;
}

interface FunctionalMetaTypeArgumentType {
	functional: true;
	from: ObjectType[];
	to: MetaType;
}

type MetaTypeArgumentType = SimpleMetaTypeArgumentType | FunctionalMetaTypeArgumentType;

export default class MetaType extends Type {
	
	public readonly left: Type[];
	public readonly right: Type;
	public readonly from: ObjectType[];
	public readonly to: MetaType;

	constructor (o: MetaTypeArgumentType) {
		super(null, null, null, o.functional);

		if (typeof o.functional != 'boolean')
			throw Node.error('typeof o.functional != \'boolean\'', null);

		if (o.functional == false) {
			if (!(o.left instanceof Array))
				throw Node.error('left should be an array', null);

			this.left = o.left;
			this.right = o.right;
		} else {
			if (o.from.some(f => !(f instanceof ObjectType)))
				throw Node.error('o.from.some(f => !(f instanceof ObjectType))', null);
			if (!(o.to instanceof MetaType))
				throw Node.error('!(o.to instanceof MetaType)', null);

			if (o.to.isFunctional)
				throw Node.error('Functional metatype in functional metatype is not supported', null);

			this.from = o.from;
			this.to = o.to;
		}
	}

	public resolve(): MetaType {
		return this;
	}

	public toIndentedString(indent: number) {
		if (this.isSimple) return `[${this.left.join(', ')} |- ${this.right}]`;

		return `[${this.from.join(', ')} -> ${this.to}]`;
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		throw new Error('Method not implemented.');
	}

	public equals(t: Type): boolean {
		if (!(t instanceof MetaType)) return false;

		if (this.isSimple != t.isSimple) return false;

		if (this.isSimple) {
			if (this.left.length != t.left.length) return false;

			for (let i = 0; i < this.left.length; i++) {
				if (!this.left[i].equals(t.left[i])) return false;
			}

			if (!this.right.equals(t.right)) return false;

			return true;
		}

		if (this.from.length != t.from.length) return false;

		for (let i = 0; i < this.from.length; i++)
			if (!this.from[i].equals(t.from[i])) return false;

		return this.to.equals(t.to);
	}
}