import ObjectFun from "./nodes/ObjectFun";
import Variable from "./nodes/Variable";

export default class ExecutionContext {

	public readonly usingList: (Variable | ObjectFun)[];

	constructor (usingList?: (Variable | ObjectFun)[]) {
		this.usingList = usingList || [];
	}

	public canUse(fun: Variable | ObjectFun) {
		return this.usingList.includes(fun);
	}
}