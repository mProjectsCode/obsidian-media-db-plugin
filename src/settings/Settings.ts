import type { App, IconName } from 'obsidian';
import { Notice, Platform, PluginSettingTab, SecretComponent, SettingGroup, setIcon } from 'obsidian';
import { render } from 'solid-js/web';
import { MediaType } from 'src/utils/MediaType';
import type MediaDbPlugin from '../main';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { fragWithHTML, mediaTypeDisplayName, unCamelCase } from '../utils/Utils';
import type { ApiSecretId } from './apiSecretIds';
import { API_SECRET_IDS } from './apiSecretIds';
import type { PropertyMappingModelData } from './PropertyMapping';
import { PropertyMapping, PropertyMappingModel, PropertyMappingOption } from './PropertyMapping';
import PropertyMappingModelsComponent from './PropertyMappingModelsComponent';
import { FileSuggest } from './suggesters/FileSuggest';
import { FolderSuggest } from './suggesters/FolderSuggest';

function mediaTypeTabIcon(mediaType: MediaType): IconName {
	switch (mediaType) {
		case MediaType.Band:
			return 'mic-2';
		case MediaType.BoardGame:
			return 'dice-3';
		case MediaType.Book:
			return 'book-marked';
		case MediaType.ComicManga:
			return 'book-open';
		case MediaType.Game:
			return 'gamepad-2';
		case MediaType.Movie:
			return 'film';
		case MediaType.MusicRelease:
			return 'disc-3';
		case MediaType.Season:
			return 'calendar-range';
		case MediaType.Series:
			return 'tv';
		case MediaType.Song:
			return 'music-4';
		case MediaType.Wiki:
			return 'library-big';
	}
}

// MARK: Settings
export interface MediaDbPluginSettings {
	OMDbKey: string;
	TMDBKey: string;
	MobyGamesKey: string;
	GiantBombKey: string;
	IGDBClientId: string;
	IGDBClientSecret: string;
	RAWGAPIKey: string;
	ComicVineKey: string;
	BoardgameGeekKey: string;
	sfwFilter: boolean;
	templates: boolean;
	customDateFormat: string;
	openNoteInNewTab: boolean;
	useDefaultFrontMatter: boolean;
	enableTemplaterIntegration: boolean;
	imageDownload: boolean;
	imageFolder: string;

	BoardgameGeekAPI_disabledMediaTypes: MediaType[];
	ComicVineAPI_disabledMediaTypes: MediaType[];
	GiantBombAPI_disabledMediaTypes: MediaType[];
	IGDBAPI_disabledMediaTypes: MediaType[];
	RAWGAPI_disabledMediaTypes: MediaType[];
	MALAPI_disabledMediaTypes: MediaType[];
	MALAPIManga_disabledMediaTypes: MediaType[];
	MobyGamesAPI_disabledMediaTypes: MediaType[];
	MusicBrainzAPI_disabledMediaTypes: MediaType[];
	MusicBrainzBandAPI_disabledMediaTypes: MediaType[];
	OMDbAPI_disabledMediaTypes: MediaType[];
	OpenLibraryAPI_disabledMediaTypes: MediaType[];
	SteamAPI_disabledMediaTypes: MediaType[];
	TMDBMovieAPI_disabledMediaTypes: MediaType[];
	TMDBSeasonAPI_disabledMediaTypes: MediaType[];
	TMDBSeriesAPI_disabledMediaTypes: MediaType[];
	VNDBAPI_disabledMediaTypes: MediaType[];
	WikipediaAPI_disabledMediaTypes: MediaType[];

	movieTemplate: string;
	seriesTemplate: string;
	seasonTemplate: string;
	mangaTemplate: string;
	gameTemplate: string;
	wikiTemplate: string;
	musicReleaseTemplate: string;
	bandTemplate: string;
	songTemplate: string;
	boardgameTemplate: string;
	bookTemplate: string;

	movieFileNameTemplate: string;
	seriesFileNameTemplate: string;
	seasonFileNameTemplate: string;
	mangaFileNameTemplate: string;
	gameFileNameTemplate: string;
	wikiFileNameTemplate: string;
	musicReleaseFileNameTemplate: string;
	bandFileNameTemplate: string;
	songFileNameTemplate: string;
	boardgameFileNameTemplate: string;
	bookFileNameTemplate: string;

	movieFolder: string;
	seriesFolder: string;
	seasonFolder: string;
	mangaFolder: string;
	gameFolder: string;
	wikiFolder: string;
	musicReleaseFolder: string;
	bandFolder: string;
	songFolder: string;
	/** When true, band discography import nests albums and songs under bandFolder/BandName/… instead of using album/song import folders. */
	bandUseFileTreeForSongs: boolean;
	boardgameFolder: string;
	bookFolder: string;

	propertyMappingModels: PropertyMappingModelData[];

	// DEPRECATED: Use propertyMappingModels instead
	moviePropertyConversionRules: string;
	seriesPropertyConversionRules: string;
	seasonPropertyConversionRules: string;
	mangaPropertyConversionRules: string;
	gamePropertyConversionRules: string;
	wikiPropertyConversionRules: string;
	musicReleasePropertyConversionRules: string;
	bandPropertyConversionRules: string;
	songPropertyConversionRules: string;
	boardgamePropertyConversionRules: string;
	bookPropertyConversionRules: string;
}

/**
 * Helper class to get/set settings for a specific media type.
 */
class MediaTypeMappedSettings {
	mediaType: MediaType;

	constructor(mediaType: MediaType) {
		this.mediaType = mediaType;
	}

	getTemplate(settings: MediaDbPluginSettings): string {
		switch (this.mediaType) {
			case MediaType.Band:
				return settings.bandTemplate;
			case MediaType.BoardGame:
				return settings.boardgameTemplate;
			case MediaType.Book:
				return settings.bookTemplate;
			case MediaType.ComicManga:
				return settings.mangaTemplate;
			case MediaType.Game:
				return settings.gameTemplate;
			case MediaType.Movie:
				return settings.movieTemplate;
			case MediaType.MusicRelease:
				return settings.musicReleaseTemplate;
			case MediaType.Season:
				return settings.seasonTemplate;
			case MediaType.Series:
				return settings.seriesTemplate;
			case MediaType.Song:
				return settings.songTemplate;
			case MediaType.Wiki:
				return settings.wikiTemplate;
		}
	}

	setTemplate(settings: MediaDbPluginSettings, template: string): void {
		switch (this.mediaType) {
			case MediaType.Band:
				settings.bandTemplate = template;
				break;
			case MediaType.BoardGame:
				settings.boardgameTemplate = template;
				break;
			case MediaType.Book:
				settings.bookTemplate = template;
				break;
			case MediaType.ComicManga:
				settings.mangaTemplate = template;
				break;
			case MediaType.Game:
				settings.gameTemplate = template;
				break;
			case MediaType.Movie:
				settings.movieTemplate = template;
				break;
			case MediaType.MusicRelease:
				settings.musicReleaseTemplate = template;
				break;
			case MediaType.Season:
				settings.seasonTemplate = template;
				break;
			case MediaType.Series:
				settings.seriesTemplate = template;
				break;
			case MediaType.Song:
				settings.songTemplate = template;
				break;
			case MediaType.Wiki:
				settings.wikiTemplate = template;
				break;
		}
	}

	getFileNameTemplate(settings: MediaDbPluginSettings): string {
		switch (this.mediaType) {
			case MediaType.Band:
				return settings.bandFileNameTemplate;
			case MediaType.BoardGame:
				return settings.boardgameFileNameTemplate;
			case MediaType.Book:
				return settings.bookFileNameTemplate;
			case MediaType.ComicManga:
				return settings.mangaFileNameTemplate;
			case MediaType.Game:
				return settings.gameFileNameTemplate;
			case MediaType.Movie:
				return settings.movieFileNameTemplate;
			case MediaType.MusicRelease:
				return settings.musicReleaseFileNameTemplate;
			case MediaType.Season:
				return settings.seasonFileNameTemplate;
			case MediaType.Series:
				return settings.seriesFileNameTemplate;
			case MediaType.Song:
				return settings.songFileNameTemplate;
			case MediaType.Wiki:
				return settings.wikiFileNameTemplate;
		}
	}

	setFileNameTemplate(settings: MediaDbPluginSettings, template: string): void {
		switch (this.mediaType) {
			case MediaType.Band:
				settings.bandFileNameTemplate = template;
				break;
			case MediaType.BoardGame:
				settings.boardgameFileNameTemplate = template;
				break;
			case MediaType.Book:
				settings.bookFileNameTemplate = template;
				break;
			case MediaType.ComicManga:
				settings.mangaFileNameTemplate = template;
				break;
			case MediaType.Game:
				settings.gameFileNameTemplate = template;
				break;
			case MediaType.Movie:
				settings.movieFileNameTemplate = template;
				break;
			case MediaType.MusicRelease:
				settings.musicReleaseFileNameTemplate = template;
				break;
			case MediaType.Season:
				settings.seasonFileNameTemplate = template;
				break;
			case MediaType.Series:
				settings.seriesFileNameTemplate = template;
				break;
			case MediaType.Song:
				settings.songFileNameTemplate = template;
				break;
			case MediaType.Wiki:
				settings.wikiFileNameTemplate = template;
				break;
		}
	}

	getFolder(settings: MediaDbPluginSettings): string {
		switch (this.mediaType) {
			case MediaType.Band:
				return settings.bandFolder;
			case MediaType.BoardGame:
				return settings.boardgameFolder;
			case MediaType.Book:
				return settings.bookFolder;
			case MediaType.ComicManga:
				return settings.mangaFolder;
			case MediaType.Game:
				return settings.gameFolder;
			case MediaType.Movie:
				return settings.movieFolder;
			case MediaType.MusicRelease:
				return settings.musicReleaseFolder;
			case MediaType.Season:
				return settings.seasonFolder;
			case MediaType.Series:
				return settings.seriesFolder;
			case MediaType.Song:
				return settings.songFolder;
			case MediaType.Wiki:
				return settings.wikiFolder;
		}
	}

	setFolder(settings: MediaDbPluginSettings, folder: string): void {
		switch (this.mediaType) {
			case MediaType.Band:
				settings.bandFolder = folder;
				break;
			case MediaType.BoardGame:
				settings.boardgameFolder = folder;
				break;
			case MediaType.Book:
				settings.bookFolder = folder;
				break;
			case MediaType.ComicManga:
				settings.mangaFolder = folder;
				break;
			case MediaType.Game:
				settings.gameFolder = folder;
				break;
			case MediaType.Movie:
				settings.movieFolder = folder;
				break;
			case MediaType.MusicRelease:
				settings.musicReleaseFolder = folder;
				break;
			case MediaType.Season:
				settings.seasonFolder = folder;
				break;
			case MediaType.Series:
				settings.seriesFolder = folder;
				break;
			case MediaType.Song:
				settings.songFolder = folder;
				break;
			case MediaType.Wiki:
				settings.wikiFolder = folder;
				break;
		}
	}
}

// MARK: Defaults
const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	OMDbKey: '',
	TMDBKey: '',
	MobyGamesKey: '',
	GiantBombKey: '',
	IGDBClientId: '',
	IGDBClientSecret: '',
	RAWGAPIKey: '',
	ComicVineKey: '',
	BoardgameGeekKey: '',
	sfwFilter: true,
	templates: true,
	customDateFormat: 'L',
	openNoteInNewTab: true,
	useDefaultFrontMatter: true,
	enableTemplaterIntegration: false,
	imageDownload: false,
	imageFolder: 'Media DB/images',

	BoardgameGeekAPI_disabledMediaTypes: [],
	ComicVineAPI_disabledMediaTypes: [],
	GiantBombAPI_disabledMediaTypes: [],
	IGDBAPI_disabledMediaTypes: [],
	RAWGAPI_disabledMediaTypes: [],
	MALAPI_disabledMediaTypes: [],
	MALAPIManga_disabledMediaTypes: [],
	MobyGamesAPI_disabledMediaTypes: [],
	MusicBrainzAPI_disabledMediaTypes: [],
	MusicBrainzBandAPI_disabledMediaTypes: [],
	OMDbAPI_disabledMediaTypes: [],
	OpenLibraryAPI_disabledMediaTypes: [],
	SteamAPI_disabledMediaTypes: [],
	TMDBMovieAPI_disabledMediaTypes: [],
	TMDBSeasonAPI_disabledMediaTypes: [],
	TMDBSeriesAPI_disabledMediaTypes: [],
	VNDBAPI_disabledMediaTypes: [],
	WikipediaAPI_disabledMediaTypes: [],

	movieTemplate: '',
	seriesTemplate: '',
	seasonTemplate: '',
	mangaTemplate: '',
	gameTemplate: '',
	wikiTemplate: '',
	musicReleaseTemplate: '',
	bandTemplate: '',
	songTemplate: '',
	boardgameTemplate: '',
	bookTemplate: '',

	movieFileNameTemplate: '{{ title }} ({{ year }})',
	seriesFileNameTemplate: '{{ title }} ({{ year }})',
	seasonFileNameTemplate: '{{ title }} ({{ year }})',
	mangaFileNameTemplate: '{{ title }} ({{ year }})',
	gameFileNameTemplate: '{{ title }} ({{ year }})',
	wikiFileNameTemplate: '{{ title }}',
	musicReleaseFileNameTemplate: '{{ title }} (by {{ ENUM:artists }} - {{ year }})',
	bandFileNameTemplate: '{{ title }}',
	songFileNameTemplate: '{{ trackNumber }}. {{ title }} ({{ albumTitle }})',
	boardgameFileNameTemplate: '{{ title }} ({{ year }})',
	bookFileNameTemplate: '{{ title }} ({{ year }})',

	movieFolder: 'Media DB/movies',
	seriesFolder: 'Media DB/series',
	seasonFolder: 'Media DB/series',
	mangaFolder: 'Media DB/comics',
	gameFolder: 'Media DB/games',
	wikiFolder: 'Media DB/wiki',
	musicReleaseFolder: 'Media DB/music',
	bandFolder: 'Media DB/bands',
	songFolder: 'Media DB/music/songs',
	bandUseFileTreeForSongs: false,
	boardgameFolder: 'Media DB/boardgames',
	bookFolder: 'Media DB/books',

	propertyMappingModels: [],

	// DEPRECATED
	moviePropertyConversionRules: '',
	seriesPropertyConversionRules: '',
	seasonPropertyConversionRules: '',
	mangaPropertyConversionRules: '',
	gamePropertyConversionRules: '',
	wikiPropertyConversionRules: '',
	musicReleasePropertyConversionRules: '',
	bandPropertyConversionRules: '',
	songPropertyConversionRules: '',
	boardgamePropertyConversionRules: '',
	bookPropertyConversionRules: '',
};

export const lockedPropertyMappings: string[] = ['type', 'id', 'dataSource'];

export function getDefaultSettings(plugin: MediaDbPlugin): MediaDbPluginSettings {
	const defaultSettings = DEFAULT_SETTINGS;

	// construct property mapping defaults
	const propertyMappingModels: PropertyMappingModelData[] = [];
	for (const mediaType of MEDIA_TYPES) {
		const model: MediaTypeModel = plugin.mediaTypeManager.createMediaTypeModelFromMediaType({}, mediaType);
		const metadataObj = model.toMetaDataObject();

		const propertyMappingModel: PropertyMappingModel = new PropertyMappingModel(mediaType);

		for (const key of Object.keys(metadataObj)) {
			propertyMappingModel.properties.push(
				new PropertyMapping(
					key,
					'',
					PropertyMappingOption.Default,
					lockedPropertyMappings.contains(key),
					false, // wikilink default
				),
			);
		}

		// Convert to plain data for serialization
		propertyMappingModels.push(propertyMappingModel.toJSON());
	}

	defaultSettings.propertyMappingModels = propertyMappingModels;
	return defaultSettings;
}

interface MediaDbSettingsTabNavEntry {
	id: string;
	nav: HTMLElement;
	panel: HTMLElement;
}

// MARK: Settings Tab
export class MediaDbSettingTab extends PluginSettingTab {
	plugin: MediaDbPlugin;
	private activeSettingsTabId: string | null = null;

	constructor(app: App, plugin: MediaDbPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private addApiSecretSetting(group: SettingGroup, name: string, description: string, secretId: ApiSecretId): void {
		group.addSetting(
			setting =>
				void setting
					.setName(name)
					.setDesc(description)
					.addComponent(el => {
						const component = new SecretComponent(this.app, el);
						component.setValue(this.app.secretStorage.getSecret(secretId) ?? '').onChange(value => {
							this.app.secretStorage.setSecret(secretId, value);
							void this.plugin.saveSettings();
						});
						return component;
					}),
		);
	}

	private static readonly MUSIC_SETTINGS_MEDIA_TYPES: readonly MediaType[] = [MediaType.Band, MediaType.MusicRelease, MediaType.Song];

	private static readonly LEGACY_MUSIC_TAB_IDS: ReadonlySet<string> = new Set(['media-band', 'media-musicRelease', 'media-song']);

	private renderMediaTypeSection(
		panel: HTMLElement,
		mediaTypeSetting: MediaTypeMappedSettings,
		mediaTypeApiMap: Map<MediaType, string[]>,
		options?: {
			sectionHeading?: string;
			hideImportFolder?: boolean;
			appendToSection?: (group: SettingGroup) => void;
		},
	): void {
		const mediaType = mediaTypeSetting.mediaType;
		const descNoun = options?.sectionHeading?.toLowerCase() ?? mediaTypeDisplayName(mediaType).toLowerCase();

		if (options?.sectionHeading) {
			panel.createEl('h3', { text: options.sectionHeading });
		}

		const mediaTypeGroup = new SettingGroup(panel);

		if (!options?.hideImportFolder) {
			mediaTypeGroup.addSetting(
				setting =>
					void setting
						.setName('Import folder')
						.setDesc(`Where newly imported ${descNoun} notes should be placed.`)
						.addSearch(cb => {
							const suggester = new FolderSuggest(this.app, cb.inputEl);
							suggester.onSelect(folder => {
								cb.setValue(folder.path);
								mediaTypeSetting.setFolder(this.plugin.settings, folder.path);
								void this.plugin.saveSettings();
								suggester.close();
							});
							cb.setPlaceholder(mediaTypeSetting.getFolder(DEFAULT_SETTINGS))
								.setValue(mediaTypeSetting.getFolder(this.plugin.settings))
								.onChange(data => {
									mediaTypeSetting.setFolder(this.plugin.settings, data);
									void this.plugin.saveSettings();
								});
						}),
			);
		}

		mediaTypeGroup.addSetting(
			setting =>
				void setting
					.setName('Template')
					.setDesc(`Template file used when creating a new ${descNoun} note.`)
					.addSearch(cb => {
						const suggester = new FileSuggest(this.app, cb.inputEl);
						suggester.onSelect(file => {
							cb.setValue(file.path);
							mediaTypeSetting.setTemplate(this.plugin.settings, file.path);
							void this.plugin.saveSettings();
							suggester.close();
						});
						cb.setPlaceholder(`Example: ${descNoun.replace(/ /g, '')}Template.md`)
							.setValue(mediaTypeSetting.getTemplate(this.plugin.settings))
							.onChange(data => {
								mediaTypeSetting.setTemplate(this.plugin.settings, data);
								void this.plugin.saveSettings();
							});
					}),
		);

		mediaTypeGroup.addSetting(
			setting =>
				void setting
					.setName('File name template')
					.setDesc(`File name template for new ${descNoun} notes.`)
					.addText(cb => {
						cb.setPlaceholder(`Example: ${mediaTypeSetting.getFileNameTemplate(DEFAULT_SETTINGS)}`)
							.setValue(mediaTypeSetting.getFileNameTemplate(this.plugin.settings))
							.onChange(data => {
								mediaTypeSetting.setFileNameTemplate(this.plugin.settings, data);
								void this.plugin.saveSettings();
							});
					}),
		);

		const apis = mediaTypeApiMap.get(mediaType) ?? [];
		if (apis.length > 1) {
			for (const apiName of apis) {
				const api = this.plugin.apiManager.apis.find(a => a.apiName === apiName);
				if (api) {
					const disabledMediaTypes = api.getDisabledMediaTypes();

					mediaTypeGroup.addSetting(
						setting =>
							void setting
								.setName(apiName)
								.setDesc(`Use ${apiName} for ${descNoun} search and import.`)
								.addToggle(cb => {
									cb.setValue(!disabledMediaTypes.includes(mediaType)).onChange(data => {
										if (data) {
											const index = disabledMediaTypes.indexOf(mediaType);
											if (index != -1) {
												disabledMediaTypes.splice(index, 1);
											}
										} else {
											disabledMediaTypes.push(mediaType);
										}
										void this.plugin.saveSettings();
									});
								}),
					);
				}
			}
		}

		options?.appendToSection?.(mediaTypeGroup);
	}

	private renderMusicSettingsTab(panel: HTMLElement, mediaTypeSettings: MediaTypeMappedSettings[], mediaTypeApiMap: Map<MediaType, string[]>): void {
		const byType = (mt: MediaType): MediaTypeMappedSettings => mediaTypeSettings.find(s => s.mediaType === mt)!;
		const fileTree = this.plugin.settings.bandUseFileTreeForSongs;

		panel.createDiv({ cls: 'media-db-plugin-spacer' });

		this.renderMediaTypeSection(panel, byType(MediaType.Band), mediaTypeApiMap, {
			sectionHeading: 'Band',
			appendToSection: group => {
				group.addSetting(
					setting =>
						void setting
							.setName('Use file trees for songs')
							.setDesc(
								'When importing a band, create a subfolder named after the band under the band import folder, place album notes there, and place each album’s songs in a subfolder named after that album. While enabled, album and song import folders are not shown below and are not used for band imports (standalone album/song imports still use those folders).',
							)
							.addToggle(cb => {
								cb.setValue(this.plugin.settings.bandUseFileTreeForSongs).onChange(data => {
									this.plugin.settings.bandUseFileTreeForSongs = data;
									void this.plugin.saveSettings();
									this.display();
								});
							}),
				);
			},
		});
		panel.createDiv({ cls: 'media-db-plugin-spacer' });
		this.renderMediaTypeSection(panel, byType(MediaType.MusicRelease), mediaTypeApiMap, {
			sectionHeading: 'Album',
			hideImportFolder: fileTree,
		});
		panel.createDiv({ cls: 'media-db-plugin-spacer' });
		this.renderMediaTypeSection(panel, byType(MediaType.Song), mediaTypeApiMap, {
			sectionHeading: 'Song',
			hideImportFolder: fileTree,
		});
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const headerNav = containerEl.createEl('nav', { cls: 'media-db-setting-header' });
		const tabGroup = headerNav.createDiv({ cls: 'media-db-setting-tab-group' });
		const settingsContentEl = containerEl.createDiv({ cls: 'media-db-setting-content' });

		const tabEntries: MediaDbSettingsTabNavEntry[] = [];

		const selectTab = (id: string): void => {
			for (const { id: tid, nav, panel } of tabEntries) {
				const on = tid === id;
				panel.toggleClass('media-db-tab-settings--hidden', !on);
				nav.toggleClass('media-db-navigation-item-selected', on);
			}
			this.activeSettingsTabId = id;
		};

		const addTab = (id: string, title: string, icon: IconName, render: (panel: HTMLElement) => void): void => {
			const nav = tabGroup.createDiv({ cls: 'media-db-navigation-item' });
			nav.addClass(Platform.isMobile ? 'media-db-mobile' : 'media-db-desktop');
			setIcon(nav.createSpan({ cls: 'media-db-navigation-item-icon' }), icon);
			nav.createSpan().setText(title);
			const panel = settingsContentEl.createDiv({ cls: 'media-db-tab-settings media-db-tab-settings--hidden' });
			render(panel);
			tabEntries.push({ id, nav, panel });
			nav.addEventListener('click', () => selectTab(id));
		};

		const mediaTypeSettings = MEDIA_TYPES.map(mt => new MediaTypeMappedSettings(mt));

		const mediaTypeApiMap = new Map<MediaType, string[]>();
		for (const api of this.plugin.apiManager.apis) {
			for (const mediaType of api.types) {
				if (!mediaTypeApiMap.has(mediaType)) {
					mediaTypeApiMap.set(mediaType, []);
				}
				mediaTypeApiMap.get(mediaType)!.push(api.apiName);
			}
		}

		addTab('general', 'General', 'sliders-horizontal', panel => {
			const generalGroup = new SettingGroup(panel);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('SFW filter')
						.setDesc('Only shows SFW results for APIs that offer filtering.')
						.addToggle(cb => {
							cb.setValue(this.plugin.settings.sfwFilter).onChange(data => {
								this.plugin.settings.sfwFilter = data;
								void this.plugin.saveSettings();
							});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Resolve {{ tags }} in templates')
						.setDesc('Whether to resolve {{ tags }} in templates. The spaces inside the curly braces are important.')
						.addToggle(cb => {
							cb.setValue(this.plugin.settings.templates).onChange(data => {
								this.plugin.settings.templates = data;
								void this.plugin.saveSettings();
							});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Date format')
						.setDesc(
							fragWithHTML(
								"Your custom date format. Use <em>'YYYY-MM-DD'</em> for example.<br>" +
									"For more syntax, refer to <a href='https://momentjs.com/docs/#/displaying/format/'>format reference</a>.<br>" +
									"Your current syntax looks like this: <b><a id='media-db-dateformat-preview' style='pointer-events: none; cursor: default; text-decoration: none;'>" +
									this.plugin.dateFormatter.getPreview() +
									'</a></b>',
							),
						)
						.addText(cb => {
							cb.setPlaceholder(DEFAULT_SETTINGS.customDateFormat)
								.setValue(this.plugin.settings.customDateFormat === DEFAULT_SETTINGS.customDateFormat ? '' : this.plugin.settings.customDateFormat)
								.onChange(data => {
									const newDateFormat = data ? data : DEFAULT_SETTINGS.customDateFormat;
									this.plugin.settings.customDateFormat = newDateFormat;
									const previewEl = document.getElementById('media-db-dateformat-preview');
									if (previewEl) {
										previewEl.textContent = this.plugin.dateFormatter.getPreview(newDateFormat); // update preview
									}
									void this.plugin.saveSettings();
								});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Open note in new tab')
						.setDesc('Open the newly created note in a new tab.')
						.addToggle(cb => {
							cb.setValue(this.plugin.settings.openNoteInNewTab).onChange(data => {
								this.plugin.settings.openNoteInNewTab = data;
								void this.plugin.saveSettings();
							});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Use default front matter')
						.setDesc('Whether to use the default front matter. If disabled, the front matter from the template will be used. Same as mapping everything to remove.')
						.addToggle(cb => {
							cb.setValue(this.plugin.settings.useDefaultFrontMatter).onChange(data => {
								this.plugin.settings.useDefaultFrontMatter = data;
								void this.plugin.saveSettings();
								// Redraw settings to display/remove the property mappings
								this.display();
							});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Enable Templater integration')
						.setDesc(
							'Enable integration with the templater plugin, this also needs templater to be installed. Warning: Templater allows you to execute arbitrary JavaScript code and system commands.',
						)
						.addToggle(cb => {
							cb.setValue(this.plugin.settings.enableTemplaterIntegration).onChange(data => {
								this.plugin.settings.enableTemplaterIntegration = data;
								void this.plugin.saveSettings();
							});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Download images')
						.setDesc('Downloads images for new notes in the folder below')
						.addToggle(cb => {
							cb.setValue(this.plugin.settings.imageDownload).onChange(data => {
								this.plugin.settings.imageDownload = data;
								void this.plugin.saveSettings();
							});
						}),
			);

			generalGroup.addSetting(
				setting =>
					void setting
						.setName('Image folder')
						.setDesc('Where downloaded images should be stored.')
						.addSearch(cb => {
							const suggester = new FolderSuggest(this.app, cb.inputEl);
							suggester.onSelect(folder => {
								cb.setValue(folder.path);
								this.plugin.settings.imageFolder = folder.path;
								void this.plugin.saveSettings();
								suggester.close();
							});
							cb.setPlaceholder(DEFAULT_SETTINGS.imageFolder)
								.setValue(this.plugin.settings.imageFolder)
								.onChange(data => {
									this.plugin.settings.imageFolder = data;
									void this.plugin.saveSettings();
								});
						}),
			);
		});

		addTab('api-keys', 'API keys', 'key', panel => {
			const apiKeyGroup = new SettingGroup(panel);

			this.addApiSecretSetting(apiKeyGroup, 'OMDb API key', 'API key for "www.omdbapi.com".', API_SECRET_IDS.omdb);
			this.addApiSecretSetting(apiKeyGroup, 'TMDB API Token', 'API Read Access Token for "https://www.themoviedb.org".', API_SECRET_IDS.tmdb);
			this.addApiSecretSetting(apiKeyGroup, 'Moby Games key', 'API key for "www.mobygames.com".', API_SECRET_IDS.mobyGames);
			this.addApiSecretSetting(apiKeyGroup, 'Giant Bomb Key', 'API key for "www.giantbomb.com".', API_SECRET_IDS.giantBomb);
			this.addApiSecretSetting(apiKeyGroup, 'IGDB Client ID', 'Client ID for IGDB API (Required for Twitch OAuth).', API_SECRET_IDS.igdbClientId);
			this.addApiSecretSetting(apiKeyGroup, 'IGDB Client Secret', 'Client Secret for IGDB API.', API_SECRET_IDS.igdbClientSecret);
			this.addApiSecretSetting(apiKeyGroup, 'RAWG API Key', 'API key for "rawg.io".', API_SECRET_IDS.rawg);
			this.addApiSecretSetting(apiKeyGroup, 'Comic Vine Key', 'API key for "www.comicvine.gamespot.com".', API_SECRET_IDS.comicVine);
			this.addApiSecretSetting(apiKeyGroup, 'Boardgame Geek Key', 'API key for "www.boardgamegeek.com".', API_SECRET_IDS.boardgameGeek);
			this.addApiSecretSetting(
				apiKeyGroup,
				'Genius API access token',
				'Client access token from https://genius.com/api-clients — used to search songs and load lyrics when importing a band.',
				API_SECRET_IDS.genius,
			);
		});

		let musicTabAdded = false;
		for (const mediaTypeSetting of mediaTypeSettings) {
			const mediaType = mediaTypeSetting.mediaType;

			if (MediaDbSettingTab.MUSIC_SETTINGS_MEDIA_TYPES.includes(mediaType)) {
				if (!musicTabAdded) {
					musicTabAdded = true;
					addTab('media-music', 'Music', 'disc-3', panel => {
						this.renderMusicSettingsTab(panel, mediaTypeSettings, mediaTypeApiMap);
					});
				}
				continue;
			}

			const mediaTypeName = unCamelCase(mediaTypeSetting.mediaType);
			addTab(`media-${mediaType}`, mediaTypeName, mediaTypeTabIcon(mediaType), panel => {
				this.renderMediaTypeSection(panel, mediaTypeSetting, mediaTypeApiMap);
			});
		}

		// MARK: Property mappings

		if (this.plugin.settings.useDefaultFrontMatter) {
			addTab('property-mappings', 'Property mappings', 'list-tree', panel => {
				const mappingGroup = new SettingGroup(panel);
				mappingGroup.addSetting(setting => {
					setting
						.setName('Property mappings explanation')
						.setDesc(
							fragWithHTML(
								'<p>Here you can customize how metadata fields are mapped to property names in the front matter of the created notes.</p>' +
									'<p>You can choose to keep the original name, rename the property, or remove it entirely.</p>' +
									'<p><strong>Remember to save your changes using the save button for each individual category.</strong></p>',
							),
						);

					render(
						() =>
							PropertyMappingModelsComponent({
								models: structuredClone(this.plugin.settings.propertyMappingModels),
								save: (model: PropertyMappingModelData): void => {
									// Update the matching model in settings (stored as plain data)
									const index = this.plugin.settings.propertyMappingModels.findIndex(m => m.type === model.type);
									if (index !== -1) {
										this.plugin.settings.propertyMappingModels[index] = model;
									}

									new Notice(`MDB: Property mappings for ${model.type} saved successfully.`);
									void this.plugin.saveSettings();
								},
							}),
						setting.descEl,
					);
				});
			});
		}

		const validIds = new Set(tabEntries.map(t => t.id));
		let initialId = this.activeSettingsTabId && validIds.has(this.activeSettingsTabId) ? this.activeSettingsTabId : 'general';
		if (MediaDbSettingTab.LEGACY_MUSIC_TAB_IDS.has(initialId) && validIds.has('media-music')) {
			initialId = 'media-music';
		}
		if (!validIds.has(initialId)) {
			initialId = 'general';
		}
		selectTab(initialId);
	}
}
