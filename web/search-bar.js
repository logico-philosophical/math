(() => {

var $input = $('#search-input'),
	$dropdown = $('#search-dropdown');

function show() {
	$dropdown.style.display = 'block';
	$input.select();
}

function dismiss() {
	$dropdown.style.display = 'none';
	$input.blur();
}

function destroy() {
	dismiss();
	$input.value = '';
	selected = false;
	list = [];
	$('ul', $dropdown).innerHTML = '';
}

hotkeys('s', (evt, handler) => {
	evt.preventDefault();
	$input.focus();
});

var selected = false,
	list = [];

$input.addEventListener('focus', evt => {
	show();
});

document.addEventListener('click', evt => {
	if (evt.target == $input || evt.target.closest('#search-dropdown')) return;

	dismiss();
})

$input.addEventListener('input', evt => {
	var v = $input.value;
	var $el = $('ul', $dropdown);
	var html = '';

	list = [];

	getList(v, '', searchDatabase).forEach(({name, match}, i) => {
		if (i == 0) selected = 0;

		html += `<li${i == 0 ? ' class="selected"' : ''}><a href="#def-${name}">`
			+ name.split('').map((e, i) => {
			return match.includes(i) ? `<b>${e}</b>` : e;
		}).join('') + '</a></li>';

		list.push(name);
	});

	$el.innerHTML = html;

	[].forEach.call($$('a', $el), $ => {
		$.addEventListener('click', evt => { destroy() });
	});
});

$input.addEventListener('keydown', evt => {
	if (evt.key == 'Enter') {
		evt.preventDefault();
		if (!list[selected]) return;

		location.href = '#def-' + list[selected];
		destroy();
	}

	if (evt.key == 'Escape') {
		evt.preventDefault();
		dismiss();
	}

	if (['ArrowDown', 'ArrowUp', 'Tab'].includes(evt.key)) {
		var direction = evt.key == 'Tab'
			? evt.shiftKey ? -1 : 1
			: evt.key == 'ArrowUp' ? -1 : 1;

		evt.preventDefault();

		var len = list.length;
		if (len <= 0) {
			selected = false;
			return;
		}

		selected = (selected + direction + len) % len;

		[].map.call($$('li', $dropdown), ($, i) => {
			$.classList[i == selected ? 'add' : 'remove']('selected');
		});
	}
});

})();