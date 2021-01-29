import Expr0 from "./nodes/Expr0";
import Metaexpr from "./nodes/Metaexpr";
import Variable from "./nodes/Variable";

export type ProofType = R | RC | RCX | RS | H | NP | Wut | T | V | E | Def;

/** repeat */
interface R {
	_type: 'R';
	ctr: number;
	num: number | [number, number];
	expr: Metaexpr;
}

interface RC {
	_type: 'RC';
	ctr: number;
	schema: number | [number, number];
	args: Expr0[];
	expr: Metaexpr;
}

interface RCX {
	_type: 'RCX';
	ctr: number;
	expr: Metaexpr;
}

interface RS {
	_type: 'RS';
	ctr: number;
	expr: Metaexpr;
}

/** hypothesis */
interface H {
	_type : 'H';
	ctr: number;
	expr: Metaexpr;
}

/** not proved */
interface NP {
	_type: 'NP';
	ctr: number;
	expr: Metaexpr;
}

interface Wut {
	_type: '?';
	ctr: number;
	expr: Metaexpr;
}

interface T {
	_type: 'T';
	ctr: [number, number];
	leftlines: H[];
	rightlines: ProofType[];
}

interface V {
	_type: 'V';
	ctr: [number, number];
	$lines: ProofType[];
	lines: ProofType[];
	params: Variable[];
}

interface E {
	_type: 'E';
	ctr: number;
	subject: number | [number, number] | Metaexpr;
	args: Expr0[];
	antecedents: (number | [number, number])[];
	reduced: Metaexpr;
}

interface Def {
	_type: 'def';
	ctr: number;
	var: Variable;
}