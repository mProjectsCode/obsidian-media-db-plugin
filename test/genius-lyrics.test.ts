import { describe, expect, test } from 'bun:test';

import { extractLyricsFromGeniusHtml } from '../src/api/helpers/geniusLyricsExtract';

describe('extractLyricsFromGeniusHtml', () => {
	test('keeps all lines when lyrics use nested divs (balanced extraction)', () => {
		const html = `
      <div data-lyrics-container="true">
        <p>Line one</p>
        <div class="nested"><p>Line two nested</p></div>
        <p>Line three</p>
      </div>
    `;
		const out = extractLyricsFromGeniusHtml(html);
		expect(out).toContain('Line one');
		expect(out).toContain('Line two nested');
		expect(out).toContain('Line three');
	});

	test('removes Genius 2024+ in-column header without breaking nested __Group / __Title classes', () => {
		const html = `<div data-lyrics-container="true" class="Lyrics__Root">
      <div data-exclude-from-selection="true" class="LyricsHeader__Container-sc-347d044d-1 gPVEFK">
        <button class="ContributorsCreditSong__Container-sc-8a479889-0 dTjlOR">
          <span class="ContributorsCreditSong__Label-sc-8a479889-1 cvGuJA">
            <span class="ContributorsCreditSong__ContributorsReference-sc-8a479889-2 eaEJmv">3 Contributors</span>
          </span>
        </button>
        <div class="LyricsHeader__GroupContainer-sc-347d044d-2 fnJciY">
          <div class="LyricsHeader__TitleContainer-sc-347d044d-3 ggEgSp">
            <h2 class="LyricsHeader__Title-sc-347d044d-0 eAbTcA brQJgQ">Book of the Fallen Lyrics</h2>
          </div>
        </div>
      </div>
      <p>First verse line<br>Second line</p>
    </div>`;
		const out = extractLyricsFromGeniusHtml(html);
		expect(out).not.toMatch(/contributors/i);
		expect(out).not.toContain('Book of the Fallen Lyrics');
		expect(out).toContain('First verse line');
		expect(out).toContain('Second line');
	});
});
