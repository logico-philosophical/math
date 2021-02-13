import { SchemaType } from "./exprs/Schema";

export type ImportOrLineObject = ImportObject | LineObject;

export type LineObject = TypedefObject
		| DefvObject
		| DefunObject
		| DefschemaObject;

export type EvaluableObject = TypedefObject
		| DefvObject
		| DefunObject
		| DefschemaObject
		| ExprObject;

export interface ImportObject {
	_type: 'import';
	filename: string;
	location: LocationObject;
}

export interface TypedefObject {
	_type: 'typedef';
	doc: string;
	expr: FtypeObject;
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
	expr?: ObjectExprObject;
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
	expr: ObjectExprObject;
	location: LocationObject;
}

export type ObjectExprObject = FuncallObject | FunexprObject | VarObject;
export type ExprObject = TeeObject | ReductionObject | SchemacallObject | WithObject | VarObject | SchemaexprObject;

export interface DefschemaObject {
	_type: 'defschema';
	doc: string;
	annotations: string[];
	schemaType: SchemaType,
	name: string;
	params: DefvObject[];
	using: string[];
	def$s: Def$Object[];
	expr: ExprObject;
	location: LocationObject;
}

export interface ReductionObject {
	_type: 'reduction';
	subject: ExprObject;
	args: Array<ObjectExprObject | null>;
	antecedents: ExprObject[];
	as: ExprObject;
	location: LocationObject;
}

export interface SchemacallObject {
	_type: 'schemacall';
	schema: ExprObject;
	args: ObjectExprObject[];
	location: LocationObject;
}

export interface FuncallObject {
	_type: 'funcall';
	schema: ObjectExprObject;
	args: ObjectExprObject[];
	location: LocationObject;
}

export interface FunexprObject {
	_type: 'funexpr';
	params: DefvObject[];
	expr: ObjectExprObject;
	location: LocationObject;
}

export interface SchemaexprObject {
	_type: 'schemaexpr';
	params: DefvObject[];
	def$s: Def$Object[];
	expr: ExprObject;
	location: LocationObject;
}

export interface WithObject {
	_type: 'with';
	with: DefvObject;
	def$s: Def$Object[];
	expr: ExprObject;
	location: LocationObject;
}

export interface TeeObject {
	_type: 'tee';
	left: ExprObject[];
	def$s: Def$Object[];
	right: ExprObject;
	location: LocationObject;
}

export interface Def$Object {
	_type: 'def$';
	name: string;
	expr: ExprObject;
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