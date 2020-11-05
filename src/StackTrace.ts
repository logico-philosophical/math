import { LocationObject } from "./PegInterfaceDefinitions";

interface StackTraceElement {
	type: string;
	name: string;
	location: LocationObject;
}

export default class StackTrace {

	public readonly fileUri: string;
	public readonly stack: StackTraceElement[];

	constructor (fileUri: string, stack?: StackTraceElement[]) {
		this.fileUri = fileUri;
		this.stack = stack || [];
	}

	public extend(element: StackTraceElement): StackTrace {
		return new StackTrace(this.fileUri, [element].concat(this.stack));
	}

	public error(message: string) {
		var fileUri = this.fileUri || '<unknown>';

		return new Error(
			message
			+ '\n\tat '
			+ (
				this.stack.length
					? this.stack.map(({type, name, location}) => {
						return `${type} ${name || '<anonymous>'} (${fileUri}:${location.start.line}:${location.start.column})`;
					}).join('\n\tat ')
					: `<root> (${fileUri}:1:1)`
			)
		);
	}
}