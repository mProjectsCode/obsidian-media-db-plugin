/**
 * ASCII-style form of a title for use as an Obsidian `aliases` entry (e.g. Likbør → Likbor).
 * Returns null when the title should not get an extra alias (unchanged after normalization).
 */
export function normalizeTitleForAsciiAlias(title: string): string | null {
	const trimmed = title.trim();
	if (!trimmed) {
		return null;
	}

	let s = trimmed.normalize('NFKD').replace(/\p{M}/gu, '');
	s = s
		.replaceAll('ø', 'o')
		.replaceAll('Ø', 'O')
		.replaceAll('ß', 'ss')
		.replaceAll('ẞ', 'SS');

	if (s === trimmed) {
		return null;
	}
	return s;
}
