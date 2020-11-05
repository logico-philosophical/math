import { LocationObject } from "./PegInterfaceDefinitions";

interface StackTraceElement {
	type: string;
	name: string;
	location: LocationObject;
}

export default class StackTrace {
	public readonly stack: StackTraceElement[];

	constructor (stack?: StackTraceElement[]) {
		this.stack = stack || [];
	}

	public extend(element: StackTraceElement): StackTrace {
		return new StackTrace([element].concat(this.stack));
	}

	public error(message: string) {
		var filename = typeof process != 'undefined' && process.argv[2];

		return new Error(
			message
			+ '\n\tat '
			+ (
				this.stack.length
					? this.stack.map(({type, name, location}) => {
						return `${type} ${name || '<anonymous>'} (${filename || '<unknown>'}:${location.start.line}:${location.start.column})`;
					}).join('\n\tat ')
					: `<root> (${filename || '<unknown>'}:1:1)`
			)
		);
	}
}