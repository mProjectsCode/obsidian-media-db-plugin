import type { App } from 'obsidian';
import { Notice, PluginSettingTab, Setting } from 'obsidian';
import type { MediaType } from 'src/utils/MediaType';
import { mount } from 'svelte';
import type MediaDbPlugin from '../main';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { fragWithHTML, unCamelCase } from '../utils/Utils';
import { PropertyMapping, PropertyMappingModel, PropertyMappingOption } from './PropertyMapping';
import PropertyMappingModelsComponent from './PropertyMappingModelsComponent.svelte';
import { FileSuggest } from './suggesters/FileSuggest';
import { FolderSuggest } from './suggesters/FolderSuggest';

export interface MediaDbPluginSettings {
	OMDbKey: string;
	TMDBKey: string;
	MobyGamesKey: string;
	GiantBombKey: string;
	ComicVineKey: string;
	sfwFilter: boolean;
	templates: boolean;
	customDateFormat: string;
	openNoteInNewTab: boolean;
	useDefaultFrontMatter: boolean;
	enableTemplaterIntegration: boolean;
	OMDbAPI_disabledMediaTypes: MediaType[];
	TMDBSeriesAPI_disabledMediaTypes: MediaType[];
	TMDBSeasonAPI_disabledMediaTypes: MediaType[];
	TMDBMovieAPI_disabledMediaTypes: MediaType[];
	MALAPI_disabledMediaTypes: MediaType[];
	MALAPIManga_disabledMediaTypes: MediaType[];
	ComicVineAPI_disabledMediaTypes: MediaType[];
	SteamAPI_disabledMediaTypes: MediaType[];
	MobyGamesAPI_disabledMediaTypes: MediaType[];
	GiantBombAPI_disabledMediaTypes: MediaType[];
	WikipediaAPI_disabledMediaTypes: MediaType[];
	BoardgameGeekAPI_disabledMediaTypes: MediaType[];
	MusicBrainzAPI_disabledMediaTypes: MediaType[];
	OpenLibraryAPI_disabledMediaTypes: MediaType[];
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

	moviePropertyConversionRules: string;
	seriesPropertyConversionRules: string;
	seasonPropertyConversionRules: string;
	mangaPropertyConversionRules: string;
	gamePropertyConversionRules: string;
	wikiPropertyConversionRules: string;
	musicReleasePropertyConversionRules: string;
	boardgamePropertyConversionRules: string;
	bookPropertyConversionRules: string;

	movieFolder: string;
	seriesFolder: string;
	seasonFolder: string;
	mangaFolder: string;
	gameFolder: string;
	wikiFolder: string;
	musicReleaseFolder: string;
	boardgameFolder: string;
	bookFolder: string;

	imageDownload: boolean;
	imageFolder: string;
	propertyMappingModels: PropertyMappingModel[];
}

const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	OMDbKey: '',
	TMDBKey: '',
	MobyGamesKey: '',
	GiantBombKey: '',
	ComicVineKey: '',
	sfwFilter: true,
	templates: true,
	customDateFormat: 'L',
	openNoteInNewTab: true,
	useDefaultFrontMatter: true,
	enableTemplaterIntegration: false,
	OMDbAPI_disabledMediaTypes: [],
	TMDBSeriesAPI_disabledMediaTypes: [],
	TMDBSeasonAPI_disabledMediaTypes: [],
	TMDBMovieAPI_disabledMediaTypes: [],
	MALAPI_disabledMediaTypes: [],
	MALAPIManga_disabledMediaTypes: [],
	ComicVineAPI_disabledMediaTypes: [],
	SteamAPI_disabledMediaTypes: [],
	MobyGamesAPI_disabledMediaTypes: [],
	GiantBombAPI_disabledMediaTypes: [],
	WikipediaAPI_disabledMediaTypes: [],
	BoardgameGeekAPI_disabledMediaTypes: [],
	MusicBrainzAPI_disabledMediaTypes: [],
	OpenLibraryAPI_disabledMediaTypes: [],
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

	moviePropertyConversionRules: '',
	seriesPropertyConversionRules: '',
	seasonPropertyConversionRules: '',
	mangaPropertyConversionRules: '',
	gamePropertyConversionRules: '',
	wikiPropertyConversionRules: '',
	musicReleasePropertyConversionRules: '',
	boardgamePropertyConversionRules: '',
	bookPropertyConversionRules: '',

	movieFolder: 'Media DB/movies',
	seriesFolder: 'Media DB/series',
	seasonFolder: 'Media DB/series',
	mangaFolder: 'Media DB/comics',
	gameFolder: 'Media DB/games',
	wikiFolder: 'Media DB/wiki',
	musicReleaseFolder: 'Media DB/music',
	boardgameFolder: 'Media DB/boardgames',
	bookFolder: 'Media DB/books',

	imageDownload: false,
	imageFolder: 'Media DB/images',
	propertyMappingModels: [],
};

export const lockedPropertyMappings: string[] = ['type', 'id', 'dataSource'];

export function getDefaultSettings(plugin: MediaDbPlugin): MediaDbPluginSettings {
	const defaultSettings = DEFAULT_SETTINGS;

	// construct property mapping defaults
	const propertyMappingModels: PropertyMappingModel[] = [];
	for (const mediaType of MEDIA_TYPES) {
		const model: MediaTypeModel = plugin.mediaTypeManager.createMediaTypeModelFromMediaType({}, mediaType);
		const metadataObj = model.toMetaDataObject();
		// console.log(metadataObj);
		// console.log(model);

		const propertyMappingModel: PropertyMappingModel = new PropertyMappingModel(mediaType);

		for (const key of Object.keys(metadataObj)) {
			propertyMappingModel.properties.push(new PropertyMapping(key, '', PropertyMappingOption.Default, lockedPropertyMappings.contains(key)));
		}

		propertyMappingModels.push(propertyMappingModel);
	}

	defaultSettings.propertyMappingModels = propertyMappingModels;
	return defaultSettings;
}

export class MediaDbSettingTab extends PluginSettingTab {
	plugin: MediaDbPlugin;

	constructor(app: App, plugin: MediaDbPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('OMDb API key')
			.setDesc('API key for "www.omdbapi.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.OMDbKey)
					.onChange(data => {
						this.plugin.settings.OMDbKey = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Moby Games key')
			.setDesc('API key for "www.mobygames.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.MobyGamesKey)
					.onChange(data => {
						this.plugin.settings.MobyGamesKey = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Giant Bomb Key')
			.setDesc('API key for "www.giantbomb.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.GiantBombKey)
					.onChange(data => {
						this.plugin.settings.GiantBombKey = data;
						void this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Comic Vine Key')
			.setDesc('API key for "www.comicvine.gamespot.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.ComicVineKey)
					.onChange(data => {
						this.plugin.settings.ComicVineKey = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('SFW filter')
			.setDesc('Only shows SFW results for APIs that offer filtering.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.sfwFilter).onChange(data => {
					this.plugin.settings.sfwFilter = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Resolve {{ tags }} in templates')
			.setDesc('Whether to resolve {{ tags }} in templates. The spaces inside the curly braces are important.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.templates).onChange(data => {
					this.plugin.settings.templates = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
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
			});

		new Setting(containerEl)
			.setName('Open note in new tab')
			.setDesc('Open the newly created note in a new tab.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.openNoteInNewTab).onChange(data => {
					this.plugin.settings.openNoteInNewTab = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Use default front matter')
			.setDesc('Whether to use the default front matter. If disabled, the front matter from the template will be used. Same as mapping everything to remove.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.useDefaultFrontMatter).onChange(data => {
					this.plugin.settings.useDefaultFrontMatter = data;
					void this.plugin.saveSettings();
					// Redraw settings to display/remove the property mappings
					this.display();
				});
			});

		new Setting(containerEl)
			.setName('Enable Templater integration')
			.setDesc(
				'Enable integration with the templater plugin, this also needs templater to be installed. Warning: Templater allows you to execute arbitrary JavaScript code and system commands.',
			)
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableTemplaterIntegration).onChange(data => {
					this.plugin.settings.enableTemplaterIntegration = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Download images')
			.setDesc('Downloads images for new notes in the folder below')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.imageDownload).onChange(data => {
					this.plugin.settings.imageDownload = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Image folder')
			.setDesc('Where downloaded images should be stored.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.imageFolder)
					.setValue(this.plugin.settings.imageFolder)
					.onChange(data => {
						this.plugin.settings.imageFolder = data;
						void this.plugin.saveSettings();
					});
			});

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

		// Filter out media types with only one API
		const filteredMediaTypes = Array.from(mediaTypeApiMap.entries()).filter(([_, apis]) => apis.length > 1);

		// Dynamically create settings based on the filtered media types and their APIs
		for (const [mediaType, apis] of filteredMediaTypes) {
			new Setting(containerEl).setName(`Select APIs for ${unCamelCase(mediaType)}`).setHeading();
			for (const apiName of apis) {
				const api = this.plugin.apiManager.apis.find(api => api.apiName === apiName);
				if (api) {
					const disabledMediaTypes = api.getDisabledMediaTypes();
					new Setting(containerEl)
						.setName(apiName)
						.setDesc(`Use ${apiName} API for ${unCamelCase(mediaType)}.`)
						.addToggle(cb => {
							cb.setValue(!disabledMediaTypes.includes(mediaType)).onChange(data => {
								if (data) {
									const index = disabledMediaTypes.indexOf(mediaType);
									if (index > -1) {
										disabledMediaTypes.splice(index, 1);
									}
								} else {
									disabledMediaTypes.push(mediaType);
								}
								void this.plugin.saveSettings();
							});
						});
				}
			}
		}

		new Setting(containerEl).setName('New file location').setHeading();
		// region new file location
		new Setting(containerEl)
			.setName('Movie folder')
			.setDesc('Where newly imported movies should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.movieFolder)
					.setValue(this.plugin.settings.movieFolder)
					.onChange(data => {
						this.plugin.settings.movieFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series folder')
			.setDesc('Where newly imported series should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.seriesFolder)
					.setValue(this.plugin.settings.seriesFolder)
					.onChange(data => {
						this.plugin.settings.seriesFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Season folder')
			.setDesc('Where newly imported seasons should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.seasonFolder)
					.setValue(this.plugin.settings.seriesFolder)
					.onChange(data => {
						this.plugin.settings.seasonFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Comic and manga folder')
			.setDesc('Where newly imported comics and manga should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.mangaFolder)
					.setValue(this.plugin.settings.mangaFolder)
					.onChange(data => {
						this.plugin.settings.mangaFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game folder')
			.setDesc('Where newly imported games should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.gameFolder)
					.setValue(this.plugin.settings.gameFolder)
					.onChange(data => {
						this.plugin.settings.gameFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki folder')
			.setDesc('Where newly imported wiki articles should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.wikiFolder)
					.setValue(this.plugin.settings.wikiFolder)
					.onChange(data => {
						this.plugin.settings.wikiFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music folder')
			.setDesc('Where newly imported music should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.musicReleaseFolder)
					.setValue(this.plugin.settings.musicReleaseFolder)
					.onChange(data => {
						this.plugin.settings.musicReleaseFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board game folder')
			.setDesc('Where newly imported board games should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.boardgameFolder)
					.setValue(this.plugin.settings.boardgameFolder)
					.onChange(data => {
						this.plugin.settings.boardgameFolder = data;
						void this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Book folder')
			.setDesc('Where newly imported books should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.bookFolder)
					.setValue(this.plugin.settings.bookFolder)
					.onChange(data => {
						this.plugin.settings.bookFolder = data;
						void this.plugin.saveSettings();
					});
			});

		// endregion

		new Setting(containerEl).setName('Template settings').setHeading();
		// region templates
		new Setting(containerEl)
			.setName('Movie template')
			.setDesc('Template file to be used when creating a new note for a movie.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: movieTemplate.md')
					.setValue(this.plugin.settings.movieTemplate)
					.onChange(data => {
						this.plugin.settings.movieTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series template')
			.setDesc('Template file to be used when creating a new note for a series.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: seriesTemplate.md')
					.setValue(this.plugin.settings.seriesTemplate)
					.onChange(data => {
						this.plugin.settings.seriesTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Season template')
			.setDesc('Template file to be used when creating a new note for a season.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: seasonTemplate.md')
					.setValue(this.plugin.settings.seasonTemplate)
					.onChange(data => {
						this.plugin.settings.seasonTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Manga and Comics template')
			.setDesc('Template file to be used when creating a new note for a manga or a comic.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: mangaTemplate.md')
					.setValue(this.plugin.settings.mangaTemplate)
					.onChange(data => {
						this.plugin.settings.mangaTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game template')
			.setDesc('Template file to be used when creating a new note for a game.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: gameTemplate.md')
					.setValue(this.plugin.settings.gameTemplate)
					.onChange(data => {
						this.plugin.settings.gameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki template')
			.setDesc('Template file to be used when creating a new note for a wiki entry.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: wikiTemplate.md')
					.setValue(this.plugin.settings.wikiTemplate)
					.onChange(data => {
						this.plugin.settings.wikiTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music release template')
			.setDesc('Template file to be used when creating a new note for a music release.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: musicReleaseTemplate.md')
					.setValue(this.plugin.settings.musicReleaseTemplate)
					.onChange(data => {
						this.plugin.settings.musicReleaseTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board game template')
			.setDesc('Template file to be used when creating a new note for a boardgame.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: boardgameTemplate.md')
					.setValue(this.plugin.settings.boardgameTemplate)
					.onChange(data => {
						this.plugin.settings.boardgameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Book template')
			.setDesc('Template file to be used when creating a new note for a book.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: bookTemplate.md')
					.setValue(this.plugin.settings.bookTemplate)
					.onChange(data => {
						this.plugin.settings.bookTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		// endregion

		new Setting(containerEl).setName('File name settings').setHeading();
		// region file name templates
		new Setting(containerEl)
			.setName('Movie file name template')
			.setDesc('Template for the file name used when creating a new note for a movie.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.movieFileNameTemplate}`)
					.setValue(this.plugin.settings.movieFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.movieFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series file name template')
			.setDesc('Template for the file name used when creating a new note for a series.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.seriesFileNameTemplate}`)
					.setValue(this.plugin.settings.seriesFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.seriesFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Season  file name template')
			.setDesc('Template for the file name used when creating a new note for a season.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.seasonFileNameTemplate}`)
					.setValue(this.plugin.settings.seasonFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.seasonFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Manga and comic file name template')
			.setDesc('Template for the file name used when creating a new note for a manga or comic.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.mangaFileNameTemplate}`)
					.setValue(this.plugin.settings.mangaFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.mangaFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game file name template')
			.setDesc('Template for the file name used when creating a new note for a game.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.gameFileNameTemplate}`)
					.setValue(this.plugin.settings.gameFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.gameFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki file name template')
			.setDesc('Template for the file name used when creating a new note for a wiki entry.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.wikiFileNameTemplate}`)
					.setValue(this.plugin.settings.wikiFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.wikiFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music release file name template')
			.setDesc('Template for the file name used when creating a new note for a music release.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.musicReleaseFileNameTemplate}`)
					.setValue(this.plugin.settings.musicReleaseFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.musicReleaseFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board game file name template')
			.setDesc('Template for the file name used when creating a new note for a boardgame.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.boardgameFileNameTemplate}`)
					.setValue(this.plugin.settings.boardgameFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.boardgameFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Book file name template')
			.setDesc('Template for the file name used when creating a new note for a book.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.bookFileNameTemplate}`)
					.setValue(this.plugin.settings.bookFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.bookFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		// endregion

		// region Property Mappings
		if (this.plugin.settings.useDefaultFrontMatter) {
			new Setting(containerEl).setName('Property mappings').setHeading();

			const propertyMappingExplanation = containerEl.createEl('div');
			propertyMappingExplanation.innerHTML = `
		<p>Choose how metadata fields are mapped to property names. The options are:</p>
		<ul>
			<li><strong>default</strong>: keep the original name.</li>
			<li><strong>remap</strong>: rename the property.</li>
			<li><strong>remove</strong>: remove the property entirely.</li>
		</ul>
		<p>
			Don't forget to save your changes using the save button for each individual category.
		</p>`;

			mount(PropertyMappingModelsComponent, {
				target: this.containerEl,
				props: {
					models: this.plugin.settings.propertyMappingModels.map(x => x.copy()),
					save: (model: PropertyMappingModel): void => {
						const propertyMappingModels: PropertyMappingModel[] = [];

						for (const model2 of this.plugin.settings.propertyMappingModels) {
							if (model2.type === model.type) {
								propertyMappingModels.push(model);
							} else {
								propertyMappingModels.push(model2);
							}
						}

						this.plugin.settings.propertyMappingModels = propertyMappingModels;
						new Notice(`MDB: Property mappings for ${model.type} saved successfully.`);
						void this.plugin.saveSettings();
					},
				},
			});
		}

		// endregion
	}
}
