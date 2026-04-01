import { describe, expect, test } from 'bun:test';

import { normalizeTitleForAsciiAlias } from '../src/utils/normalizeTitleForAlias';

describe('normalizeTitleForAsciiAlias', () => {
	test('maps Polish ł and Ł to ASCII l and L', () => {
		expect(normalizeTitleForAsciiAlias('Bełchatów')).toBe('Belchatow');
		expect(normalizeTitleForAsciiAlias('Łódź')).toBe('Lodz');
	});

	test('maps ligatures æ œ and stroke / Nordic / German letters', () => {
		expect(normalizeTitleForAsciiAlias('Rændering')).toBe('Raendering');
		expect(normalizeTitleForAsciiAlias('Œdipus')).toBe('Oedipus');
		expect(normalizeTitleForAsciiAlias('København')).toBe('Kobenhavn');
		expect(normalizeTitleForAsciiAlias('Straße')).toBe('Strasse');
	});

	test('maps eth, thorn, d-bar, Turkish dotless i, eng, apostrophe-n', () => {
		expect(normalizeTitleForAsciiAlias('Þór')).toBe('Thor');
		expect(normalizeTitleForAsciiAlias('Đặc')).toBe('Dac');
		expect(normalizeTitleForAsciiAlias('Bağcılar')).toBe('Bagcilar');
		expect(normalizeTitleForAsciiAlias('Eĸa')).toBe('Eka');
		expect(normalizeTitleForAsciiAlias('Muŋ')).toBe('Mung');
	});

	test('returns null when input is already ASCII-equivalent after NFKD', () => {
		expect(normalizeTitleForAsciiAlias('Plain Title')).toBe(null);
	});
});
