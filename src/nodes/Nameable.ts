export default interface Nameable {
	name: string;
}

export function isNameable(obj: object): obj is Nameable {
	return 'name' in obj;
}