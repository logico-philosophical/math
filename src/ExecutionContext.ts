import ObjectFun from "./nodes/ObjectFun";

export default class ExecutionContext {

	public readonly usingList: ObjectFun[];

	constructor (usingList?: ObjectFun[]) {
		this.usingList = usingList || [];
	}

	public uses(fun: ObjectFun) {
		return this.usingList.includes(fun);
	}
}