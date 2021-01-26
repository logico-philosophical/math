var nmax = 10;

function getList(keyword, inputBefore, list) {
	keyword = keyword.toLowerCase().trim();

	if (!keyword || keyword == '$') return [];

	return (keyword.startsWith('$') ? inputBefore.match(/\$?[a-z0-9_]*/gi) || [] : list)
		.map(name => {
			var lowername = name.toLowerCase();

			var pname = 0;
			var matchptrs = [];

			for (var pval = 0; pval < keyword.length; pval++) {
				if (pname >= name.length) return false;
				
				while (lowername[pname] != keyword[pval]) {
					pname++;
					if (pname >= name.length) return false;
				}

				matchptrs.push(pname);
				pname++;
			}

			return {
				name,
				match: matchptrs
			};
		})
		.filter(e => e)
		.sort((a, b) => {
			for (var i = 0; i < a.match.length; i++) {
				if (a.match[i] != b.match[i])
					return a.match[i] - b.match[i];
			}

			return a.name.localeCompare(b.name);
		})
		.slice(0, nmax);
}

onmessage = function (e) {
	postMessage(getList(...e.data));
}