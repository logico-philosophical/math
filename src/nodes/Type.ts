import StackTrace from "../StackTrace";
import Node from "./Node";

export default abstract class Type extends Node {
	public readonly isFunctional: boolean;
	public readonly isSimple: boolean;
	
	public abstract equals(t: Type): boolean;

	constructor (trace: StackTrace, doc: string, tex: string, isFunctional: boolean) {
		super(trace, doc, tex);
		this.isFunctional = isFunctional;
		this.isSimple = !isFunctional;
	}

	public abstract resolve(): Type;
}