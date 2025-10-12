document.querySelectorAll('.pageInput').forEach((input) => {
	input.addEventListener('keydown', (e) => {

		const allowed = ['Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
		if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
			e.preventDefault();
			return;
		}

		if (e.key === 'Enter') {
			const page = Number(input.value);
			const max = Number(input.max);
			const min = Number(input.min);

			if (!isNaN(page) && page >= min && page <= max) {
				const parts = window.location.pathname.split('/');
				parts[parts.length - 1] = page + '.html';
				window.location.href = parts.join('/');
			}

			input.value = '';
			input.blur();
		}
	});
});
