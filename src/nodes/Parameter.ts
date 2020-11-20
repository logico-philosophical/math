import StackTrace from "../StackTrace";
import { Precedence } from "./Node";
import ObjectType from "./ObjectType";
import Variable from "./Variable";

interface ParameterArgumentType {
	doc?: string;
	tex?: string;
	type: ObjectType;
	name: string;
	selector: string;
}

export default class Parameter extends Variable {

	public readonly selector: string;

	constructor ({doc, tex, type, name, selector}: ParameterArgumentType, trace: StackTrace) {
		super({doc, tex, sealed: false, type, name, expr: null}, trace);

		this.selector = selector;
	}

	public toTeXStringWithId(prec?: Precedence, root?: boolean): string {
		var id =`id-${this._id}`;

		return [
			`\\htmlId{${id}}{`,
			this.toTeXString(prec, root),
			`}`
		].join('');
	}
}