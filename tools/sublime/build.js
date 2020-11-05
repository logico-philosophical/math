var fs = require('fs');
var math = require('../..');
var pegjs = require('pegjs');

if (!process.argv[2]) {
	throw Error('Filename not given');
}

(async () => {
	try {
		var parser = pegjs.generate(math.grammar, {cache: true});
		var program = new math.Program(parser);
		await program.loadModule(process.argv[2], filename => ({
			fileUri: filename + '.math',
			code: fs.readFileSync(filename + '.math', 'utf-8')
		}));
	} catch (e) {
		console.error(e);
		return;
	}
})();