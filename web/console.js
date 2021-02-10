(() => {

CodeMirror.keyMap.sublime['Shift-Ctrl-Enter'] = null;
CodeMirror.keyMap.sublime['Ctrl-L'] = null;

var codemirror = CodeMirror(el => {
	el.id = 'console-input';
	$('.console-wrap').appendChild(el);
}, {
	placeholder: 'Shift + Enter to submit',
	lineNumbers: true,
	lineWrapping: true,
	indentUnit: 4,
	tabSize: 4,
	indentWithTabs: true,
	inputStyle: 'textarea',
	viewportMargin: Infinity,
	keyMap: 'sublime'
});

function hint() {
	if (typeof program == 'undefined') return;

	const cursor = codemirror.getCursor();
	var str = codemirror.getRange({line:0,ch:0}, cursor);
	var keywordMatch = str.match(/\$?[a-z0-9_]*$/i);
	if (!keywordMatch) return;
	var keyword = keywordMatch[0];
	var inputBefore = str.substring(0, str.length - keyword.length);

	return {
		list: getList(keyword, inputBefore, searchDatabase).map(({name, match}) => ({
			text: name,
			render($el, self, data) {
				var $span = document.createElement('span');
				$span.innerHTML = name.split('').map((e, i) => {
					return match.includes(i) ? `<b>${e}</b>` : e;
				}).join('');
				$el.appendChild($span);
			}
		})),
		from: codemirror.posFromIndex(codemirror.indexFromPos(cursor) - keyword.length),
		to: cursor
	};
}

codemirror.on('inputRead', function (editor, event) {
	CodeMirror.showHint(codemirror, hint, {
		completeSingle: false,
		extraKeys: {
			'Shift-Tab': (cm, handle) => {
				handle.moveFocus(-1);
			},
			Tab(cm, handle) {
				handle.moveFocus(1);
			}
		}
	});
});

function htmlify(v, o) {
	var {input, noescape, error} = o || {};

	var $tr = document.createElement('tr');
	$tr.innerHTML =  `<td>${input ? '&gt;' : '&lt;'}</td><td>${noescape ? v : escapeHtml(v)}</td>`;
	if (error) {
		$tr.classList.add('error');
	}

	return $tr;
}

function write(v, o) {
	var $tr = htmlify(v, o);

	if ($('#console-display-preview')) {
		$('#console-display').insertBefore($tr, $('#console-display-preview'));
	} else {
		$('#console-display').appendChild($tr);
	}

	$('#console-display-wrap').scrollTop = $('#console-display-wrap').scrollHeight;
}

function preview(v, o) {
	var $tr = htmlify(v, o);

	if ($('#console-display-preview')) {
		$('#console-display').removeChild($('#console-display-preview'));
	}

	$tr.id = 'console-display-preview';

	$('#console-display').appendChild($tr);
}

var timeout = null;

function showPreview() {
	if (typeof program == 'undefined') {
		$('#console-input').value = '';
		return preview('Error: program is not defined', {error: true});
	}

	try {
		var v = codemirror.getValue();

		if (!v.trim()) return;
		
		var parsed = evalParser.parse(v);
	} catch (e) {
		preview(`Parse error: ${e.message}\n    at (<repl>:${e.location.start.line}:${e.location.start.column})`, {error: true});
		return;
	}

	try {
		preview(ktx(program.evaluate(parsed).toTeXString(true, true)), {
			noescape: true
		});
	} catch (e) {
		preview(e, {error: true});
	}
}

$('#console-input').addEventListener('keydown', evt => {
	if (timeout) {
		clearTimeout(timeout);
	}

	timeout = setTimeout(() => {
		showPreview();
		timeout = null;
	}, 1000);

	if (evt.key == 'Enter') {
		// submit
		if (evt.shiftKey) {
			evt.preventDefault();

			var v = codemirror.getValue();

			if (!v.trim()) return;

			write(v.trim(), {input: true});

			if (typeof program == 'undefined') {
				$('#console-input').value = '';
				return write('Error: program is not defined', {error: true});
			}

			try {
				var parsed = evalParser.parse(v);
			} catch (e) {
				write(`Parse error: ${e.message}\n    at (<repl>:${e.location.start.line}:${e.location.start.column})`, {error: true});
				if (!evt.ctrlKey) codemirror.setValue('');
				return;
			}

			try {
				write(ktx(program.evaluate(parsed).toTeXString(true, true)), {
					noescape: true
				});
			} catch (e) {
				console.error(e);
				write(e, {error: true});
			} finally {
				if (!evt.ctrlKey) codemirror.setValue('');
			}

			return;
		}
	}

	// clear console
	if (evt.ctrlKey && evt.key == 'l') {
		evt.preventDefault();
		$('#console-display').innerHTML = '';
		write('Console was cleared');
	}

	if (evt.key == 'F7') {
		evt.preventDefault();
		toggleConsole();
	}
});

function toggleConsole() {
	var hidden = $('.console-wrap-wrap').style.display == 'none';
	$('.console-wrap-wrap').style.display = hidden ? 'flex' : 'none';

	if (hidden) {
		codemirror.focus();
		codemirror.refresh();
	}
}

$('#button-show-console').addEventListener('click', () => {
	toggleConsole();
});

hotkeys('c,f7', (evt, handler) => {
	evt.preventDefault();
	toggleConsole();
});

})();