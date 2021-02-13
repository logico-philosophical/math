var n: number = 0;

export default {
	peek(): number {
		return n;
	},
	next(): number {
		return ++n;
	}
};