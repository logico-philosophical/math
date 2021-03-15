var expansionList = [];

function generateTypedefHtml(k, v) {
	return `<div class="block">`
		+ `<p class="label"><a id="type-${k}" href="#type-${k}"><b>type</b> ${k}</a></p>`
		+ `<div class="math">${ktx(v.toTeXString(true, true))}</div>`

		+ (
			v.doc
			? '<p class="label"><b>description</b></p>'
				+ `<p class="description">${m42kup.render(v.doc)}</p>`
			: ''
		)

		+ `</div>`;
}

function generateDefHtml(k, v) {
	return `<div class="block">`
		+ `<p class="label"><a id="def-${k}" href="#def-${k}"><b>${
			v.sealed ? 'sealed ' : ''
		}definition</b> ${k}</a>${!v.params
				? ': ' + v.type
				: `(${v.params.map(p => p.toSimpleString()).join(', ')})`
					+ `: ${v.type.resolve().to}`
		}</p>`
		+ `<div class="math">${ktx(v.toTeXString(true, true))}</div>`

		+ (
			v.doc
			? '<p class="label"><b>description</b></p>'
				+ `<p class="description">${m42kup.render(v.doc)}</p>`
			: ''
		)

		+ `</div>`;
}

function generateSchemaHtml(k, v, omitProofExplorer) {
	return `<div class="block">`
		+ `<p class="label"><a id="def-${k}" href="#def-${k}">${
			v.annotations.map(a => `<b class="red">${a}</b> `).join('')
		}<b>${v.schemaType}</b> ${k}</a>(${v.params.map(p => p.toSimpleString()).join(', ')})${
			v.context.usingList.length
				? ` <b>using</b> ${v.context.usingList.map(u => u.name).join(', ')}`
				: ''
		}</p>`
		+ `<div class="math">${ktx(v.toTeXString(true, true))}</div>`

		+ (
			!v.expr || v.schemaType == 'axiom' || omitProofExplorer
				? ''
				: '<p class="label"><b>proof explorer</b></p>'
					+ (
						expansionList.includes(k)
							? `<p>${program.getProofExplorer(k, ktx)}</p>`
							: `<p><input type="button" value="show" class="colored button-expand-proof" onclick="this.parentElement.innerHTML = program.getProofExplorer('${k}', ktx);expansionList.push('${k}');"></p>`
					)
		)

		+ (
			v.doc
			? '<p class="label"><b>description</b></p>'
				+ `<p class="description">${m42kup.render(v.doc)}</p>`
			: ''
		)

		+ `</div>`;
}

function generateHtml(program) {
	console.log('--- HTML GENERATION START ---');
	var start = new Date(), end;

	var precedenceMap = new Map();

	var primitiveTypeList = [],
		macroTypeList = [],
		primitiveDefinitionList = [],
		macroDefinitionList = [],
		axiomSchemaList = [],
		notProvedList = [],
		provedList = [];
	
	var ret = '';

	function printThisScope(scope) {
		var map = {};

		for (var [k, v] of scope.defMap) {
			var prec = v.precedence;
			if (prec) {
				if (precedenceMap.has(prec)) {
					precedenceMap.set(prec, precedenceMap.get(prec).concat([k]));
				} else {
					precedenceMap.set(prec, [k]);
				}	
			}
		}

		primitiveTypeList = primitiveTypeList.concat(
			[...scope.typedefMap]
				.filter(([k, v]) => !v.expr).map(([k, v]) => k)
		);

		macroTypeList = macroTypeList.concat(
			[...scope.typedefMap]
				.filter(([k, v]) => v.expr).map(([k, v]) => k)
		);

		primitiveDefinitionList = primitiveDefinitionList.concat(
			[...scope.defMap]
				.filter(([k, v]) => !v.expr).map(([k, v]) => k)
		);

		macroDefinitionList = macroDefinitionList.concat(
			[...scope.defMap]
				.filter(([k, v]) => v.expr).map(([k, v]) => k)
		);
		
		axiomSchemaList = axiomSchemaList.concat(
			[...scope.schemaMap]
				.filter(([k, v]) => v.schemaType == 'axiom').map(([k, v]) => k)
		);

		notProvedList = notProvedList.concat(
			[...scope.schemaMap]
				.filter(([k, v]) => !v.isProved()).map(([k, v]) => k)
		);

		provedList = provedList.concat(
			[...scope.schemaMap]
				.filter(([k, v]) => v.schemaType != 'axiom' && v.isProved()).map(([k, v]) => k)
		);

		for (var [k, v] of scope.typedefMap) {
			map[v._id] = generateTypedefHtml(k, v);
		}

		for (var [k, v] of scope.defMap) {
			map[v._id] = generateDefHtml(k, v);
		}

		for (var [k, v] of scope.schemaMap) {
			map[v._id] = generateSchemaHtml(k, v);
		}

		return `<h3 class="label">${scope.fileUri} (${Object.keys(map).length})</h3><div class="block-file">`
			+ Object.keys(map).sort((l, r) => l._id - r._id).map(k => map[k]).join('')
			+ '</div>';
	}

	var visitedFiles = [filename];

	function printImportedScopes(scope) {
		var ret = '';

		for (var [k, s] of scope.importMap) {
			if (visitedFiles.includes(k)) continue;
			visitedFiles.push(k);

			ret += printImportedScopes(s);
			ret += printThisScope(s);
		}

		return ret;
	}
	
	ret += printImportedScopes(program.scope);
	ret += printThisScope(program.scope);

	end = new Date();
	console.log('--- HTML GENERATION END ---');
	console.log(`HTML generation took ${end - start} ms`);
	console.log('--- HTML RENDER START ---');
	start = new Date();

	precedenceMap = [...precedenceMap].sort((a, b) => a[0] - b[0]);

	$('#precedence').innerHTML = `
	<p>현재 연산자 우선순위는 다음과 같습니다.</p>

	<table>
		<tr><th>우선순위</th><th>연산자</th></tr>
		${precedenceMap.map(([k, v]) => {
			return `<tr><td>${k}</td><td>${v.map(w => {
				return `<a href="#def-${w}">${w}</a>`;
			}).join(', ')}</td></tr>`;
		}).join('')}
	</table>

	<p>위 표는 자동으로 생성되었습니다.</p>`;
	
	$('#summary').innerHTML = `
	<ul>
		<li><p><b>타입</b>(${primitiveTypeList.length + macroTypeList.length})</p>
		<ul>
			<li><b>원시 타입</b>(${primitiveTypeList.length}): ${
				primitiveTypeList.map(n => `<a href="#type-${n}">${n}</a>`).join(', ')
			}
			<li><b>매크로</b>(${macroTypeList.length}): ${
				macroTypeList.map(n => `<a href="#type-${n}">${n}</a>`).join(', ')
			}
		</ul>

		<li><p><b>정의</b>(${primitiveDefinitionList.length + macroDefinitionList.length})</p>
		<ul>
			<li><b>원시 기호</b>(${primitiveDefinitionList.length}): ${
				primitiveDefinitionList.map(n => `<a href="#def-${n}">${n}</a>`).join(', ')
			}
			<li><b>매크로</b>(${macroDefinitionList.length}): ${
				macroDefinitionList.map(n => `<a href="#def-${n}">${n}</a>`).join(', ')
			}
		</ul>
		
		<li><p><b>스키마</b>(${axiomSchemaList.length + notProvedList.length + provedList.length})</p>
		<ul>
			<li><b>공리</b>(${axiomSchemaList.length}): ${
				axiomSchemaList.map(n => `<a href="#def-${n}">${n}</a>`).join(', ')
			}
			<li><b>증명되지 않음</b>(${notProvedList.length}): ${
				notProvedList.map(n => `<a href="#def-${n}">${n}</a>`).join(', ')
			}
			<li><b>정리</b>(${provedList.length})
		</ul>
	</ul>`;

	$('#all').innerHTML = ret;

	end = new Date();
	console.log('--- HTML RENDER END ---');
	console.log(`HTML render took ${end - start} ms`);
}