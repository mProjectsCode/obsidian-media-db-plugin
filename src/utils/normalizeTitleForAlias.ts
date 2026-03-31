/**
 * ASCII-style form of a title for use as an Obsidian `aliases` entry (e.g. Likbør → Likbor).
 * Returns null when the title should not get an extra alias (unchanged after normalization).
 *
 * NFKD + stripping marks handles most Latin letters; pairs below cover letters that do not
 * decompose usefully (ligatures, stroke letters, eth/thorn, eng, Turkish dotless i, …).
 */
const ASCII_ALIAS_FOLDS: readonly [string, string][] = [
	['æ', 'ae'],
	['Æ', 'Ae'],
	['œ', 'oe'],
	['Œ', 'Oe'],
	['ø', 'o'],
	['Ø', 'O'],
	['ß', 'ss'],
	['ẞ', 'SS'],
	['ð', 'd'],
	['Ð', 'D'],
	['þ', 'th'],
	['Þ', 'Th'],
	['đ', 'd'],
	['Đ', 'D'],
	['ı', 'i'],
	['ħ', 'h'],
	['Ħ', 'H'],
	['ŋ', 'ng'],
	['Ŋ', 'Ng'],
	['Ł', 'L'],
	['ł', 'l'],
	['Ŀ', 'L'],
	['ŀ', 'l'],
	['ĸ', 'k'],
	['ŉ', "'n"],
	['ƿ', 'w'],
];

export function normalizeTitleForAsciiAlias(title: string): string | null {
	const trimmed = title.trim();
	if (!trimmed) {
		return null;
	}

	let s = trimmed.normalize('NFKD').replace(/\p{M}/gu, '');
	for (const [from, to] of ASCII_ALIAS_FOLDS) {
		s = s.replaceAll(from, to);
	}

	if (s === trimmed) {
		return null;
	}
	return s;
}
