import type { App } from 'obsidian';
import { Notice, PluginSettingTab, SettingGroup } from 'obsidian';
import { render } from 'solid-js/web';
import { MediaType } from 'src/utils/MediaType';
import type MediaDbPlugin from '../main';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { fragWithHTML, unCamelCase } from '../utils/Utils';
import type { PropertyMappingModelData } from './PropertyMapping';
import { PropertyMapping, PropertyMappingModel, PropertyMappingOption } from './PropertyMapping';
import PropertyMappingModelsComponent from './PropertyMappingModelsComponent';
import { FileSuggest } from './suggesters/FileSuggest';
import { FolderSuggest } from './suggesters/FolderSuggest';

// MARK: Settings
export interface MediaDbPluginSettings {
	OMDbKey: string;
	TMDBKey: string;
	MobyGamesKey: string;
	GiantBombKey: string;
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
	MALAPI_disabledMediaTypes: MediaType[];
	MALAPIManga_disabledMediaTypes: MediaType[];
	MobyGamesAPI_disabledMediaTypes: MediaType[];
	MusicBrainzAPI_disabledMediaTypes: MediaType[];
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
	boardgameTemplate: string;
	bookTemplate: string;

	movieFileNameTemplate: string;
	seriesFileNameTemplate: string;
	seasonFileNameTemplate: string;
	mangaFileNameTemplate: string;
	gameFileNameTemplate: string;
	wikiFileNameTemplate: string;
	musicReleaseFileNameTemplate: string;
	boardgameFileNameTemplate: string;
	bookFileNameTemplate: string;

	movieFolder: string;
	seriesFolder: string;
	seasonFolder: string;
	mangaFolder: string;
	gameFolder: string;
	wikiFolder: string;
	musicReleaseFolder: string;
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
			case MediaType.Movie:
				return settings.movieTemplate;
			case MediaType.Series:
				return settings.seriesTemplate;
			case MediaType.Season:
				return settings.seasonTemplate;
			case MediaType.ComicManga:
				return settings.mangaTemplate;
			case MediaType.Game:
				return settings.gameTemplate;
			case MediaType.Wiki:
				return settings.wikiTemplate;
			case MediaType.MusicRelease:
				return settings.musicReleaseTemplate;
			case MediaType.BoardGame:
				return settings.boardgameTemplate;
			case MediaType.Book:
				return settings.bookTemplate;
		}
	}

	setTemplate(settings: MediaDbPluginSettings, template: string): void {
		switch (this.mediaType) {
			case MediaType.Movie:
				settings.movieTemplate = template;
				break;
			case MediaType.Series:
				settings.seriesTemplate = template;
				break;
			case MediaType.Season:
				settings.seasonTemplate = template;
				break;
			case MediaType.ComicManga:
				settings.mangaTemplate = template;
				break;
			case MediaType.Game:
				settings.gameTemplate = template;
				break;
			case MediaType.Wiki:
				settings.wikiTemplate = template;
				break;
			case MediaType.MusicRelease:
				settings.musicReleaseTemplate = template;
				break;
			case MediaType.BoardGame:
				settings.boardgameTemplate = template;
				break;
			case MediaType.Book:
				settings.bookTemplate = template;
				break;
		}
	}

	getFileNameTemplate(settings: MediaDbPluginSettings): string {
		switch (this.mediaType) {
			case MediaType.Movie:
				return settings.movieFileNameTemplate;
			case MediaType.Series:
				return settings.seriesFileNameTemplate;
			case MediaType.Season:
				return settings.seasonFileNameTemplate;
			case MediaType.ComicManga:
				return settings.mangaFileNameTemplate;
			case MediaType.Game:
				return settings.gameFileNameTemplate;
			case MediaType.Wiki:
				return settings.wikiFileNameTemplate;
			case MediaType.MusicRelease:
				return settings.musicReleaseFileNameTemplate;
			case MediaType.BoardGame:
				return settings.boardgameFileNameTemplate;
			case MediaType.Book:
				return settings.bookFileNameTemplate;
		}
	}

	setFileNameTemplate(settings: MediaDbPluginSettings, template: string): void {
		switch (this.mediaType) {
			case MediaType.Movie:
				settings.movieFileNameTemplate = template;
				break;
			case MediaType.Series:
				settings.seriesFileNameTemplate = template;
				break;
			case MediaType.Season:
				settings.seasonFileNameTemplate = template;
				break;
			case MediaType.ComicManga:
				settings.mangaFileNameTemplate = template;
				break;
			case MediaType.Game:
				settings.gameFileNameTemplate = template;
				break;
			case MediaType.Wiki:
				settings.wikiFileNameTemplate = template;
				break;
			case MediaType.MusicRelease:
				settings.musicReleaseFileNameTemplate = template;
				break;
			case MediaType.BoardGame:
				settings.boardgameFileNameTemplate = template;
				break;
			case MediaType.Book:
				settings.bookFileNameTemplate = template;
				break;
		}
	}

	getFolder(settings: MediaDbPluginSettings): string {
		switch (this.mediaType) {
			case MediaType.Movie:
				return settings.movieFolder;
			case MediaType.Series:
				return settings.seriesFolder;
			case MediaType.Season:
				return settings.seasonFolder;
			case MediaType.ComicManga:
				return settings.mangaFolder;
			case MediaType.Game:
				return settings.gameFolder;
			case MediaType.Wiki:
				return settings.wikiFolder;
			case MediaType.MusicRelease:
				return settings.musicReleaseFolder;
			case MediaType.BoardGame:
				return settings.boardgameFolder;
			case MediaType.Book:
				return settings.bookFolder;
		}
	}

	setFolder(settings: MediaDbPluginSettings, folder: string): void {
		switch (this.mediaType) {
			case MediaType.Movie:
				settings.movieFolder = folder;
				break;
			case MediaType.Series:
				settings.seriesFolder = folder;
				break;
			case MediaType.Season:
				settings.seasonFolder = folder;
				break;
			case MediaType.ComicManga:
				settings.mangaFolder = folder;
				break;
			case MediaType.Game:
				settings.gameFolder = folder;
				break;
			case MediaType.Wiki:
				settings.wikiFolder = folder;
				break;
			case MediaType.MusicRelease:
				settings.musicReleaseFolder = folder;
				break;
			case MediaType.BoardGame:
				settings.boardgameFolder = folder;
				break;
			case MediaType.Book:
				settings.bookFolder = folder;
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
	MALAPI_disabledMediaTypes: [],
	MALAPIManga_disabledMediaTypes: [],
	MobyGamesAPI_disabledMediaTypes: [],
	MusicBrainzAPI_disabledMediaTypes: [],
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
	boardgameTemplate: '',
	bookTemplate: '',

	movieFileNameTemplate: '{{ title }} ({{ year }})',
	seriesFileNameTemplate: '{{ title }} ({{ year }})',
	seasonFileNameTemplate: '{{ title }} ({{ year }})',
	mangaFileNameTemplate: '{{ title }} ({{ year }})',
	gameFileNameTemplate: '{{ title }} ({{ year }})',
	wikiFileNameTemplate: '{{ title }}',
	musicReleaseFileNameTemplate: '{{ title }} (by {{ ENUM:artists }} - {{ year }})',
	boardgameFileNameTemplate: '{{ title }} ({{ year }})',
	bookFileNameTemplate: '{{ title }} ({{ year }})',

	movieFolder: 'Media DB/movies',
	seriesFolder: 'Media DB/series',
	seasonFolder: 'Media DB/series',
	mangaFolder: 'Media DB/comics',
	gameFolder: 'Media DB/games',
	wikiFolder: 'Media DB/wiki',
	musicReleaseFolder: 'Media DB/music',
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

// MARK: Settings Tab
export class MediaDbSettingTab extends PluginSettingTab {
	plugin: MediaDbPlugin;

	constructor(app: App, plugin: MediaDbPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const mediaTypeSettings = MEDIA_TYPES.map(mt => new MediaTypeMappedSettings(mt));

		// MARK: General settings
		const generalGroup = new SettingGroup(containerEl);

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

		// MARK: API keys
		const apiKeyGroup = new SettingGroup(containerEl);
		apiKeyGroup.setHeading('API Keys');

		apiKeyGroup.addSetting(
			setting =>
				void setting
					.setName('OMDb API key')
					.setDesc('API key for "www.omdbapi.com".')
					// .addComponent((el) => {
					// 	let component = new SecretComponent(this.app, el);

					// 	component.setValue(this.plugin.settings.OMDbKey).onChange(data => {
					// 		this.plugin.settings.OMDbKey = data;
					// 		void this.plugin.saveSettings();
					// 	});

					// 	return component;
					// })
					.addText(cb => {
						cb.setPlaceholder('API key')
							.setValue(this.plugin.settings.OMDbKey)
							.onChange(data => {
								this.plugin.settings.OMDbKey = data;
								void this.plugin.saveSettings();
							});
					}),
		);
		apiKeyGroup.addSetting(
			setting =>
				void setting
					.setName('TMDB API key')
					.setDesc('API key for "https://www.themoviedb.org".')
					.addText(cb => {
						cb.setPlaceholder('API key')
							.setValue(this.plugin.settings.TMDBKey)
							.onChange(data => {
								this.plugin.settings.TMDBKey = data;
								void this.plugin.saveSettings();
							});
					}),
		);
		apiKeyGroup.addSetting(
			setting =>
				void setting
					.setName('Moby Games key')
					.setDesc('API key for "www.mobygames.com".')
					.addText(cb => {
						cb.setPlaceholder('API key')
							.setValue(this.plugin.settings.MobyGamesKey)
							.onChange(data => {
								this.plugin.settings.MobyGamesKey = data;
								void this.plugin.saveSettings();
							});
					}),
		);
		apiKeyGroup.addSetting(
			setting =>
				void setting
					.setName('Giant Bomb Key')
					.setDesc('API key for "www.giantbomb.com".')
					.addText(cb => {
						cb.setPlaceholder('API key')
							.setValue(this.plugin.settings.GiantBombKey)
							.onChange(data => {
								this.plugin.settings.GiantBombKey = data;
								void this.plugin.saveSettings();
							});
					}),
		);
		apiKeyGroup.addSetting(
			setting =>
				void setting
					.setName('Comic Vine Key')
					.setDesc('API key for "www.comicvine.gamespot.com".')
					.addText(cb => {
						cb.setPlaceholder('API key')
							.setValue(this.plugin.settings.ComicVineKey)
							.onChange(data => {
								this.plugin.settings.ComicVineKey = data;
								void this.plugin.saveSettings();
							});
					}),
		);
		apiKeyGroup.addSetting(
			setting =>
				void setting
					.setName('Boardgame Geek Key')
					.setDesc('API key for "www.boardgamegeek.com".')
					.addText(cb => {
						cb.setPlaceholder('API key')
							.setValue(this.plugin.settings.BoardgameGeekKey)
							.onChange(data => {
								this.plugin.settings.BoardgameGeekKey = data;
								void this.plugin.saveSettings();
							});
					}),
		);

		// MARK: Media type settings

		// Create a map to store APIs for each media type
		const mediaTypeApiMap = new Map<MediaType, string[]>();

		// Populate the map with APIs for each media type dynamically
		for (const api of this.plugin.apiManager.apis) {
			for (const mediaType of api.types) {
				if (!mediaTypeApiMap.has(mediaType)) {
					mediaTypeApiMap.set(mediaType, []);
				}
				mediaTypeApiMap.get(mediaType)!.push(api.apiName);
			}
		}

		for (const mediaTypeSetting of mediaTypeSettings) {
			const mediaTypeGroup = new SettingGroup(containerEl);
			const mediaType = mediaTypeSetting.mediaType;
			const mediaTypeName = unCamelCase(mediaTypeSetting.mediaType);
			const mediaTypeNameLower = mediaTypeName.toLowerCase();

			mediaTypeGroup.setHeading(`${mediaTypeName} settings`);

			// Folder
			mediaTypeGroup.addSetting(
				setting =>
					void setting
						.setName(`Import Folder`)
						.setDesc(`Where newly imported ${mediaTypeNameLower} should be placed.`)
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

			// Template
			mediaTypeGroup.addSetting(
				setting =>
					void setting
						.setName(`Template`)
						.setDesc(`Template file to be used when creating a new note for a ${mediaTypeNameLower}.`)
						.addSearch(cb => {
							const suggester = new FileSuggest(this.app, cb.inputEl);
							suggester.onSelect(file => {
								cb.setValue(file.path);
								mediaTypeSetting.setTemplate(this.plugin.settings, file.path);
								void this.plugin.saveSettings();
								suggester.close();
							});
							cb.setPlaceholder(`Example: ${mediaTypeNameLower}Template.md`)
								.setValue(mediaTypeSetting.getTemplate(this.plugin.settings))
								.onChange(data => {
									mediaTypeSetting.setTemplate(this.plugin.settings, data);
									void this.plugin.saveSettings();
								});
						}),
			);

			// File name template
			mediaTypeGroup.addSetting(
				setting =>
					void setting
						.setName(`File name template`)
						.setDesc(`Template for the file name used when creating a new note for a ${mediaTypeNameLower}.`)
						.addText(cb => {
							cb.setPlaceholder(`Example: ${mediaTypeSetting.getFileNameTemplate(DEFAULT_SETTINGS)}`)
								.setValue(mediaTypeSetting.getFileNameTemplate(this.plugin.settings))
								.onChange(data => {
									mediaTypeSetting.setFileNameTemplate(this.plugin.settings, data);
									void this.plugin.saveSettings();
								});
						}),
			);

			// APIs
			const apis = mediaTypeApiMap.get(mediaType) ?? [];
			if (apis.length > 1) {
				for (const apiName of apis) {
					const api = this.plugin.apiManager.apis.find(api => api.apiName === apiName);
					if (api) {
						const disabledMediaTypes = api.getDisabledMediaTypes();

						mediaTypeGroup.addSetting(
							setting =>
								void setting
									.setName(apiName)
									.setDesc(`Use ${apiName} API for ${unCamelCase(mediaType)}.`)
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
		}

		// MARK: Property mappings

		if (this.plugin.settings.useDefaultFrontMatter) {
			const mappingGroup = new SettingGroup(containerEl);
			mappingGroup.setHeading('Property mappings');
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
		}
	}
}
