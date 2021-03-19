start =
	_
	imports:(i:import _ {return i})*
	lines:(a:line _ {return a})*
	{return imports.concat(lines)}

line =
	typedef
	/ defv
	/ defun
	/ defschema

evaluable =
	_ e:evaluable_internal _ {return e}

evaluable_internal =
	typedef
	/ defv
	/ defun
	/ defschema
	/ expr

import =
	'import' __
	filename:ident _
	sem
	{
		return {
			_type: 'import',
			filename,
			location: location()
		}
	}

typedef =
	doc:(documentation __)?
	"type" __
	name:ident _
	expr:('=' _ o:ftype _ {return o})?
	sem
	{
		return {
			_type: 'typedef',
			doc: doc ? doc[0] : null,
			expr,
			name,
			location: location()
		}
	}

defv =
	doc:(documentation __)?
	tex:(tex __)?
	sealed:('sealed' __)?
	type:type __
	name:ident _
	expr:(
		"=" _
		expr:objectexpr _
		sem
		{return expr}
		/ sem {return null}
	)
	{
		return {
			_type: 'defv',
			isParam: false,
			doc: doc ? doc[0] : null,
			tex: tex ? tex[0] : null,
			sealed: !!sealed,
			type,
			name,
			expr,
			location: location()
		}
	}

defparam =
	tex:(tex __)? type:type __ name:ident
	{
		return {
			_type: 'defv',
			isParam: true,
			doc: null,
			tex: tex ? tex[0] : null,
			type,
			name,
			location: location()
		}
	}

defschemaparam =
	tex:(tex __)? type:type __ name:ident
	selector:(_ ':' _ '@' g:$[a-z0-9_]+ {return g})?
	{
		return {
			_type: 'defv',
			isParam: true,
			doc: null,
			tex: tex ? tex[0] : null,
			type,
			name,
			selector,
			location: location()
		}
	}
 
defun =
	doc:(documentation __)?
	tex_attributes:(tex_attributes __)?
	tex:(tex __)?
	sealed:('sealed' __)?
	rettype:type __
	name:ident _
	params:(
		"(" _
		p:(
			head:defparam _
			tail:("," _ tv:defparam _ {return tv})*
			{return [head].concat(tail)}
		)?
		")" _
		{return p || []}
	)
	expr:(
		"{" _
		expr:objectexpr _
		"}"
		{return expr}
		/ sem {return null}
	)
	{
		return {
			_type: 'defun',
			doc: doc ? doc[0] : null,
			tex_attributes: tex_attributes ? tex_attributes[0] : {
				precedence: false
			},
			tex: tex ? tex[0] : null,
			sealed: !!sealed,
			rettype,
			name,
			params,
			expr,
			location: location()
		}
	}

defschema =
	doc:(documentation __)?
	annotations: (a:annotation __ {return a})*
	schemaType:('axiom' / 'theorem' / 'schema') __
	name:ident _
	params:(
		"(" _
		p:(
			head:defschemaparam _
			tail:("," _ tv:defschemaparam _ {return tv})*
			{return [head].concat(tail)}
		)?
		")" _
		{return p || []}
	)
	using:(
		'using' __
		x:(
			head:ident _
			tail:(',' _ n:ident _ {return n})*
			{return [head].concat(tail)}
		)
		{return x}
	)?
	"{" _
	defdollars: (d:defdollar _ {return d})* _
	expr:expr _
	"}"
	{
		return {
			_type: 'defschema',
			doc: doc ? doc[0] : null,
			annotations,
			schemaType,
			name,
			params,
			using: using || [],
			def$s: defdollars,
			expr,
			location: location()
		}
	}

// var[...]
// foo(...)[...]
// foo[...][...]
// (expr)[...]
// schema(?, ...)[...]
reduction =
	antecedents:(
		a:expr_internal_2 {return [a]}
		/ "[" _
		b:(
			head:expr _
			tail:(";" _ e:expr _ {return e})*
			{return [head].concat(tail)}
		)?
		"]"
		{return b || []}
	)
	right:(
		_ '>' _
		subject:(
			schemacall
			/ var
			/ "(" _
			e:expr _
			")"
			{return e}
		)
		args:(
			_ "(" _
			a:(
				head:('?' {return null} / objectexpr) _
				tail:("," _ e:('?' {return null} / objectexpr) _ {return e})*
				{return [head].concat(tail)}
			)?
			")"
			{return a || []}
		)?
		as_:(
			__ 'as' __
			m:expr_internal_2
			{return m}
		)?
		{return {subject, args, as_: as_ || null};}
	)+
	{
		var ret = {
			_type: 'reduction',
			subject: right[0].subject,
			args: right[0].args,
			antecedents,
			as: right[0].as_,
			location: location()
		};

		for (var i = 1; i < right.length; i++) {
			ret = {
				_type: 'reduction',
				subject: right[i].subject,
				args: right[i].args,
				antecedents: [ret],
				as: right[i].as_,
				location: location()
			}
		}
		
		return ret;
	}

// var(...)
// (expr)(...)
schemacall =
	schema:(
		var
		/ "(" _ e:expr _ ")"
		{return e}
	) _
	args:(
		"(" _
		a:(
			head:objectexpr _
			tail:("," _ e:objectexpr _ {return e})*
			{return [head].concat(tail)}
		)?
		")"
		{return a || []}
	)
	{
		return {
			_type: 'schemacall',
			schema,
			args,
			location: location()
		}
	}

// forall(f, g)
// (objectexpr)(f, g)
funcall =
	schema:(
		var
		/ "(" _
		e:objectexpr _
		")"
		{return e}
	) _
	args:(
		"(" _
		a:(
			head:objectexpr _
			tail:("," _ e:objectexpr _ {return e})*
			{return [head].concat(tail)}
		)?
		")"
		{return a || []}
	)
	{
		return {
			_type: 'funcall',
			schema,
			args,
			location: location()
		}
	}

// (T t) => objectexpr
// (T t) => { objectexpr }
funexpr =
	params:(
		"(" _
		p:(
			head:defparam _
			tail:("," _ tv:defparam _ {return tv})*
			{return [head].concat(tail)}
		)?
		")" _
		{return p || []}
	)
	"=>" _
	expr:(
		objectexpr
		/ "{" _ e:objectexpr _ "}" {return e}
	)
	{
		return {
			_type: 'funexpr',
			params,
			expr,
			location: location()
		}
	}

// (T t) => expr_internal_1
// (T t) => { $foo = ...; expr }
schemaexpr =
	params:(
		"(" _
		p:(
			head:defparam _
			tail:("," _ tv:defparam _ {return tv})*
			{return [head].concat(tail)}
		)?
		")" _
		{return p || []}
	)
	"=>" _
	foo:(
		expr:expr_internal_1
		{return {defdollars: [], expr}}
		/ "{" _
		defdollars: (d:defdollar _ {return d})* _
		expr:expr _
		"}"
		{return {defdollars, expr}}
	)
	{
		return {
			_type: 'schemaexpr',
			params,
			def$s: foo.defdollars,
			expr: foo.expr,
			location: location()
		}
	}

tee =
	left:(
		l:(
			head:expr_internal_1 _
			tail:("," _ e:expr_internal_1 _ {return e})*
			{return [head].concat(tail)}
		)? {return l || []}
	)
	"|-" _
	foo:(
		expr:expr_internal_2
		{return {defdollars: [], expr}}
		/ "{" _
		defdollars: (d:defdollar _ {return d})* _
		expr:expr _
		"}"
		{return {defdollars, expr}}
	)
	{
		return {
			_type: 'tee',
			def$s: foo.defdollars,
			left,
			right: foo.expr,
			location: location()
		}
	}

with =
	'with' _ '(' _
	doc:(documentation __)?
	tex:(tex __)?
	type:type __
	varname:ident _
	"=" _
	varexpr:objectexpr _
	')' _ '{' _
	defdollars: (d:defdollar _ {return d})* _
	expr:expr _
	'}'
	{
		return {
			_type: 'with',
			with: {
				_type: 'defv',
				isParam: false,
				doc: doc ? doc[0] : null,
				tex: tex ? tex[0] : null,
				sealed: false,
				type,
				name: varname,
				expr: varexpr,
				location: location()
			},
			def$s: defdollars,
			expr,
			location: location()
		}
	}

expr =
	expr_internal_3

expr_internal_3 =
	reduction
	/ expr_internal_2

expr_internal_2 =
	tee
	/ expr_internal_1

/*
 * The following should hold:
 *
 * - `schemacall` should precede `var`.
 *
 */
expr_internal_1 =
	schemacall
	/ var
	/ schemaexpr
	/ with
	/ "(" _ e:expr _ ")" {return e}

objectexpr =
	funcall
	/ funexpr
	/ var
	/ "(" _ e:objectexpr _ ")" {return e}

defdollar =
	name:dollar_ident _
	'=' _
	expr:expr _
	sem
	{
		return {
			_type: 'def$',
			name,
			expr,
			location: location()
		};
	}

type =
	stype
	/ ftype

stype =
	name:ident
	{
		return {
			_type: 'type',
			ftype: false,
			name,
			location: location()
		}
	}

ftype =
	"[" _
	from:(
		head:type
		tail:(_ "," _ t:type {return t})*
		{return [head].concat(tail)}
	) _
	"->" _
	to:type _
	"]"
	{
		return {
			_type: 'type',
			ftype: true,
			from,
			to,
			location: location()
		}
	}

var =
	at_var
	/ dollar_var
	/ plain_var

at_var =
	name:at_ident
	{
		return {
			_type: 'var',
			type: '@',
			name: name.slice(1),
			location: location()
		}
	}

dollar_var =
	name:dollar_ident
	{
		return {
			_type: 'var',
			type: '$',
			name: name,
			location: location()
		}
	}

plain_var =
	name:ident
	{
		return {
			_type: 'var',
			type: 'normal',
			name,
			location: location()
		}
	}

keyword =
	'as'
	/ 'axiom'
	/ 'import'
	/ 'schema'
	/ 'sealed'
	/ 'theorem'
	/ 'type'
	/ 'using'
	/ 'with'

annotation =
	'@discouraged'
	/ '@deprecated'

ident =
	$(!(keyword ![a-zA-Z0-9_]) [a-zA-Z0-9_]+)

at_ident =
	$('@' [a-zA-Z0-9_]+)

dollar_ident =
	$('$' [a-zA-Z0-9_]+)

documentation =
	'"' b:$(!'"' a:. {return a})* '"' {
		return b.replace(/\r\n|\r/g, '\n');
	}

tex_attributes =
	'[' _ 'precedence=' _ precedence:$[0-9]+ _ ']' {
		return {
			precedence: precedence * 1
		}
	}

tex =
	'$' b:$(!'$' a:. {return a})* '$' {
		return b.replace(/\r\n|\r/g, '\n');
	}

comment =
	"//" (!newline .)*
	/ "/*" (!"*/" .)* "*/"

newline =
	"\r\n" / "\r" / "\n"

// optional whitespace
_ =
	([ \t\n\r] / comment)*

// mandatory whitespace
__ =
	([ \t\n\r] / comment)+

sem =
	";"