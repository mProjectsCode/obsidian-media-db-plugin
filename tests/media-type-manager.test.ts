import { expect, test } from 'bun:test';
import { MovieModel } from 'packages/obsidian/src/models/MovieModel';
import type { MediaDbPluginSettings } from 'packages/obsidian/src/settings/Settings';
import { MediaTypeManager } from 'packages/obsidian/src/utils/MediaTypeManager';

function createSettings(overrides: Partial<MediaDbPluginSettings> = {}): MediaDbPluginSettings {
	return {
		movieFileNameTemplate: '{{ title }} ({{ year }})',
		seriesFileNameTemplate: '',
		seasonFileNameTemplate: '',
		mangaFileNameTemplate: '',
		gameFileNameTemplate: '',
		wikiFileNameTemplate: '',
		musicReleaseFileNameTemplate: '',
		boardgameFileNameTemplate: '',
		bookFileNameTemplate: '',
		movieTemplate: '',
		seriesTemplate: '',
		seasonTemplate: '',
		mangaTemplate: '',
		gameTemplate: '',
		wikiTemplate: '',
		musicReleaseTemplate: '',
		boardgameTemplate: '',
		bookTemplate: '',
		...overrides,
	} as MediaDbPluginSettings;
}

test('getFileName falls back to title when templates have not been initialized', () => {
	const manager = new MediaTypeManager();
	const movie = new MovieModel({ title: 'Arrival', year: '2016' });

	expect(manager.getFileName(movie)).toBe('Arrival');
});

test('getFileName uses the configured template for the media type', () => {
	const manager = new MediaTypeManager();
	const movie = new MovieModel({ title: 'Arrival', year: '2016' });

	manager.updateTemplates(createSettings({ movieFileNameTemplate: '{{ title }} - {{ year }}' }));

	expect(manager.getFileName(movie)).toBe('Arrival - 2016');
});

test('getFileName omits undefined template values', () => {
	const manager = new MediaTypeManager();
	const movie = new MovieModel({ title: 'Arrival', year: undefined });

	manager.updateTemplates(createSettings({ movieFileNameTemplate: '{{ title }} {{ missingField }} {{ year }}' }));

	expect(manager.getFileName(movie)).toBe('Arrival ');
});

test('getFileName sanitizes illegal filename characters and duplicate spaces', () => {
	const manager = new MediaTypeManager();
	const movie = new MovieModel({ title: 'Star: Trek /  First <Contact>', year: '1996' });

	manager.updateTemplates(createSettings({ movieFileNameTemplate: '{{ title }}   {{ year }}' }));

	expect(manager.getFileName(movie)).toBe('Star - Trek - First Contact 1996');
});
