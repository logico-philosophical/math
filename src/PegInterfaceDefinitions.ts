import { SchemaType } from "./nodes/Schema";

export type LineObject = ImportObject
		| TypedefObject
		| DefvObject
		| DefunObject
		| DefschemaObject;

export type EvaluableObject = TypedefObject
		| DefvObject
		| DefunObject
		| DefschemaObject
		| MetaexprObject;

export interface ImportObject {
	_type: 'import';
	filename: string;
	location: LocationObject;
}

export interface TypedefObject {
	_type: 'typedef';
	doc: string;
	base: boolean;
	origin?: FtypeObject;
	name: string;
	location: LocationObject;
}

export interface DefvObject {
	_type: 'defv';
	isParam: boolean;
	selector?: string;
	doc: string;
	tex: string;
	sealed?: boolean;
	type: TypeObject;
	name: string;
	expr?: Expr0Object;
	location: LocationObject;
}

export interface DefunObject {
	_type: 'defun';
	doc: string;
	tex: string;
	sealed: boolean;
	rettype: TypeObject;
	name: string;
	params: DefvObject[];
	expr: Expr0Object;
	location: LocationObject;
}

export type Expr0Object = FuncallObject | FunexprObject | VarObject;
export type MetaexprObject = TeeObject | ReductionObject | SchemacallObject | WithObject | VarObject | SchemaexprObject;

export interface DefschemaObject {
	_type: 'defschema';
	doc: string;
	annotations: string[];
	schemaType: SchemaType,
	name: string;
	params: DefvObject[];
	using: string[];
	def$s: Def$Object[];
	expr: MetaexprObject;
	location: LocationObject;
}

export interface ReductionObject {
	_type: 'reduction';
	subject: MetaexprObject;
	args: Array<Expr0Object | null>;
	leftargs: MetaexprObject[];
	as: MetaexprObject;
	location: LocationObject;
}

export interface SchemacallObject {
	_type: 'schemacall';
	schema: MetaexprObject;
	args: Expr0Object[];
	location: LocationObject;
}

export interface FuncallObject {
	_type: 'funcall';
	schema: Expr0Object;
	args: Expr0Object[];
	location: LocationObject;
}

export interface FunexprObject {
	_type: 'funexpr';
	params: DefvObject[];
	expr: Expr0Object;
	location: LocationObject;
}

export interface SchemaexprObject {
	_type: 'schemaexpr';
	params: DefvObject[];
	def$s: Def$Object[];
	expr: MetaexprObject;
	location: LocationObject;
}

export interface WithObject {
	_type: 'with';
	with: DefvObject;
	def$s: Def$Object[];
	expr: MetaexprObject;
	location: LocationObject;
}

export interface TeeObject {
	_type: 'tee';
	left: MetaexprObject[];
	def$s: Def$Object[];
	right: MetaexprObject;
	location: LocationObject;
}

export interface Def$Object {
	_type: 'def$';
	name: string;
	expr: MetaexprObject;
	location: LocationObject;
}

export interface StypeObject {
	_type: 'type';
	ftype: false;
	name: string;
	location: LocationObject;
}

export interface FtypeObject {
	_type: 'type';
	ftype: true;
	from: TypeObject[];
	to: TypeObject;
	location: LocationObject;
}

export type TypeObject = StypeObject | FtypeObject;

export interface VarObject {
	_type: 'var';
	type: '@' | '$' | 'normal';
	name: string;
	location: LocationObject;
}

export interface LocationObject {
	start: LocationObjectInternal;
	end: LocationObjectInternal;
}

interface LocationObjectInternal {
	offset: number;
	line: number;
	column: number;
}