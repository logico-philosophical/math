export default class Counter {

	private n: number;

	constructor (start: number=0) {
		this.n = start;
	}

	public peek(): number {
		return this.n;
	}

	public next(): number {
		return ++this.n;
	}
}