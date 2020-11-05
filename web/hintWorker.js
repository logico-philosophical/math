var nmax = 10;

function getList(value, names) {
	value = value.toLowerCase().trim();

	if (!value) return [];

	return names
		.map(name => {
			var lowername = name.toLowerCase();

			var pname = 0;
			var matchptrs = [];

			for (var pval = 0; pval < value.length; pval++) {
				if (pname >= name.length) return false;
				
				while (lowername[pname] != value[pval]) {
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