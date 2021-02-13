import ObjectFun from "./exprs/ObjectFun";
import Variable from "./exprs/Variable";

export default class ExecutionContext {

	public readonly usingList: (Variable | ObjectFun)[];

	constructor (usingList?: (Variable | ObjectFun)[]) {
		this.usingList = usingList || [];
	}

	public canUse(fun: Variable | ObjectFun) {
		return this.usingList.includes(fun);
	}
}