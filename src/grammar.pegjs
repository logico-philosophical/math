start =
	_ lines:(a:line _ {return a})* {return lines}

line =
	import
	/ typedef
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
	/ metaexpr

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
	base:("base" __)?
	"type" __
	origin:(o:ftype __ {return o})?
	name:ident _ sem
	{
		return {
			_type: 'typedef',
			doc: doc ? doc[0] : null,
			base: !!base,
			origin,
			name,
			location: location()
		}
	}

defv =
	doc:(documentation __)? tex:(tex __)? type:type __ name:ident _ sem
	{
		return {
			_type: 'defv',
			isParam: false,
			doc: doc ? doc[0] : null,
			tex: tex ? tex[0] : null,
			type,
			name,
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
		expr:expr0 _
		"}"
		{return expr}
		/ sem {return null}
	)
	{
		return {
			_type: 'defun',
			doc: doc ? doc[0] : null,
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
	schemaType:('axiom' / 'schema') __
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
	expr:metaexpr _
	"}"
	{
		return {
			_type: 'defschema',
			doc: doc ? doc[0] : null,
			annotations,
			axiomatic: schemaType == 'axiom',
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
// (metaexpr)[...]
// schema(?, ...)[...]
reduction =
	subject:(
		schemacall
		/ var
		/ "(" _
		e:metaexpr _
		")"
		{return e}
	) _
	args:(
		"(" _
		a:(
			head:('?' {return null} / expr0) _
			tail:("," _ e:('?' {return null} / expr0) _ {return e})*
			{return [head].concat(tail)}
		)?
		")"
		{return a || []}
	)?
	leftargs:(
		"[" _
		a:(
			head:metaexpr _
			tail:(";" _ e:metaexpr _ {return e})*
			{return [head].concat(tail)}
		)?
		"]"
		b:(
			_ '[' _
			'as' __
			m:metaexpr
			']'
			{return m}
		)?
		{return {a: a || [], b: b || null}}
	)+
	{
		var ret = {
			_type: 'reduction',
			subject,
			args,
			leftargs: leftargs[0].a,
			as: leftargs[0].b,
			location: location()
		};

		for (var i = 1; i < leftargs.length; i++) {
			ret = {
				_type: 'reduction',
				subject: ret,
				args: null,
				leftargs: leftargs[i].a,
				as: leftargs[i].b,
				location: location()
			};
		}

		return ret;
	}

// var(...)
// (metaexpr)(...)
schemacall =
	schema:(
		var
		/ "(" _ e:metaexpr _ ")"
		{return e}
	) _
	args:(
		"(" _
		a:(
			head:expr0 _
			tail:("," _ e:expr0 _ {return e})*
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
// (expr0)(f, g)
funcall =
	schema:(
		var
		/ "(" _
		e:expr0 _
		")"
		{return e}
	) _
	args:(
		"(" _
		a:(
			head:expr0 _
			tail:("," _ e:expr0 _ {return e})*
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

// (T t) => expr0
// (T t) => { expr0 }
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
		expr0
		/ "{" _ e:expr0 _ "}" {return e}
	)
	{
		return {
			_type: 'funexpr',
			params,
			expr,
			location: location()
		}
	}

// (T t) => metaexpr_internal_1
// (T t) => { $foo = ...; metaexpr }
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
		expr:metaexpr_internal_1
		{return {defdollars: [], expr}}
		/ "{" _
		defdollars: (d:defdollar _ {return d})* _
		expr:metaexpr _
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

metaexpr =
	left:(
		l:(
			head:metaexpr_internal_1 _
			tail:("," _ e:metaexpr_internal_1 _ {return e})*
			{return [head].concat(tail)}
		)? {return l || []}
	)
	"|-" _
	defdollars: (d:defdollar _ {return d})* _
	right:metaexpr
	{
		return {
			_type: 'tee',
			def$s: defdollars,
			left,
			right,
			location: location()
		}
	}
	/ metaexpr_internal_1

/*
 * 다음이 성립하여야 한다.
 *
 * - reduction이 schemacall보다 앞이다.
 * - schemacall이 var보다 앞이다.
 *
 */
metaexpr_internal_1 =
	reduction
	/ schemacall
	/ var
	/ schemaexpr
	/ "(" _ e:metaexpr _ ")" {return e}

expr0 =
	funcall
	/ funexpr
	/ var
	/ "(" _ e:expr0 _ ")" {return e}

defdollar =
	name:dollar_ident _
	'=' _
	expr:metaexpr _
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
		type:type {return [type]}
		/ (
			tt:(
				"(" _
				head: type
				tail:(_ "," _ t:type {return t})*
				_ ")"
				{return [head].concat(tail)}
			)
			{return tt}
		)
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
	/ 'base'
	/ 'import'
	/ 'schema'
	/ 'sealed'
	/ 'type'
	/ 'using'

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
		return b
	}

tex =
	'$' b:$(!'$' a:. {return a})* '$' {
		return b
	}

comment =
	"#" (!newline .)*
	/ "//" (!newline .)*
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