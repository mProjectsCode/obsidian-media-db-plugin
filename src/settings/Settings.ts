import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

import MediaDbPlugin from '../main';
import { FolderSuggest } from './suggesters/FolderSuggest';
import { FileSuggest } from './suggesters/FileSuggest';
import PropertyMappingModelsComponent from './PropertyMappingModelsComponent.svelte';
import { PropertyMapping, PropertyMappingModel, PropertyMappingOption } from './PropertyMapping';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { MediaTypeModel } from '../models/MediaTypeModel';

export interface MediaDbPluginSettings {
	OMDbKey: string;
	sfwFilter: boolean;
	useCustomYamlStringifier: boolean;
	templates: boolean;

	movieTemplate: string;
	seriesTemplate: string;
	gameTemplate: string;
	wikiTemplate: string;
	musicReleaseTemplate: string;
	boardgameTemplate: string;

	movieFileNameTemplate: string;
	seriesFileNameTemplate: string;
	gameFileNameTemplate: string;
	wikiFileNameTemplate: string;
	musicReleaseFileNameTemplate: string;
	boardgameFileNameTemplate: string;

	moviePropertyConversionRules: string;
	seriesPropertyConversionRules: string;
	gamePropertyConversionRules: string;
	wikiPropertyConversionRules: string;
	musicReleasePropertyConversionRules: string;
	boardgamePropertyConversionRules: string;

	movieFolder: string;
	seriesFolder: string;
	gameFolder: string;
	wikiFolder: string;
	musicReleaseFolder: string;
	boardgameFolder: string;

	propertyMappingModels: PropertyMappingModel[];
}

const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	OMDbKey: '',
	sfwFilter: true,
	useCustomYamlStringifier: true,
	templates: true,

	movieTemplate: '',
	seriesTemplate: '',
	gameTemplate: '',
	wikiTemplate: '',
	musicReleaseTemplate: '',
	boardgameTemplate: '',

	movieFileNameTemplate: '{{ title }} ({{ year }})',
	seriesFileNameTemplate: '{{ title }} ({{ year }})',
	gameFileNameTemplate: '{{ title }} ({{ year }})',
	wikiFileNameTemplate: '{{ title }}',
	musicReleaseFileNameTemplate: '{{ title }} (by {{ ENUM:artists }} - {{ year }})',
	boardgameFileNameTemplate: '{{ title }} ({{ year }})',

	moviePropertyConversionRules: '',
	seriesPropertyConversionRules: '',
	gamePropertyConversionRules: '',
	wikiPropertyConversionRules: '',
	musicReleasePropertyConversionRules: '',
	boardgamePropertyConversionRules: '',

	movieFolder: 'Media DB/movies',
	seriesFolder: 'Media DB/series',
	gameFolder: 'Media DB/games',
	wikiFolder: 'Media DB/wiki',
	musicReleaseFolder: 'Media DB/music',
	boardgameFolder: 'Media DB/boardgames',

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

		containerEl.createEl('h2', { text: 'Media DB Plugin Settings' });

		new Setting(containerEl)
			.setName('OMDb API key')
			.setDesc('API key for "www.omdbapi.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.OMDbKey)
					.onChange(data => {
						this.plugin.settings.OMDbKey = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('SFW filter')
			.setDesc('Only shows SFW results for APIs that offer filtering.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.sfwFilter).onChange(data => {
					this.plugin.settings.sfwFilter = data;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('YAML formatter')
			.setDesc('Add optional quotation marks around strings in the metadata block.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.useCustomYamlStringifier).onChange(data => {
					this.plugin.settings.useCustomYamlStringifier = data;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Resolve {{ tags }} in templates')
			.setDesc('Whether to resolve {{ tags }} in templates. The spaces inside the curly braces are important.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.templates).onChange(data => {
					this.plugin.settings.templates = data;
					this.plugin.saveSettings();
				});
			});

		containerEl.createEl('h3', { text: 'New File Location' });
		// region new file location
		new Setting(containerEl)
			.setName('Movie Folder')
			.setDesc('Where newly imported movies should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.movieFolder)
					.setValue(this.plugin.settings.movieFolder)
					.onChange(data => {
						this.plugin.settings.movieFolder = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series Folder')
			.setDesc('Where newly imported series should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.seriesFolder)
					.setValue(this.plugin.settings.seriesFolder)
					.onChange(data => {
						this.plugin.settings.seriesFolder = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game Folder')
			.setDesc('Where newly imported games should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.gameFolder)
					.setValue(this.plugin.settings.gameFolder)
					.onChange(data => {
						this.plugin.settings.gameFolder = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki Folder')
			.setDesc('Where newly imported wiki articles should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.wikiFolder)
					.setValue(this.plugin.settings.wikiFolder)
					.onChange(data => {
						this.plugin.settings.wikiFolder = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music Folder')
			.setDesc('Where newly imported music should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.musicReleaseFolder)
					.setValue(this.plugin.settings.musicReleaseFolder)
					.onChange(data => {
						this.plugin.settings.musicReleaseFolder = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board Game Folder')
			.setDesc('Where newly imported board games should be places.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.boardgameFolder)
					.setValue(this.plugin.settings.boardgameFolder)
					.onChange(data => {
						this.plugin.settings.boardgameFolder = data;
						this.plugin.saveSettings();
					});
			});
		// endregion

		containerEl.createEl('h3', { text: 'Template Settings' });
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
						this.plugin.saveSettings();
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
						this.plugin.saveSettings();
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
						this.plugin.saveSettings();
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
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music Release template')
			.setDesc('Template file to be used when creating a new note for a music release.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: musicReleaseTemplate.md')
					.setValue(this.plugin.settings.musicReleaseTemplate)
					.onChange(data => {
						this.plugin.settings.musicReleaseTemplate = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board Game template')
			.setDesc('Template file to be used when creating a new note for a boardgame.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: boardgameTemplate.md')
					.setValue(this.plugin.settings.boardgameTemplate)
					.onChange(data => {
						this.plugin.settings.boardgameTemplate = data;
						this.plugin.saveSettings();
					});
			});
		// endregion

		containerEl.createEl('h3', { text: 'File Name Settings' });
		// region file name templates
		new Setting(containerEl)
			.setName('Movie file name template')
			.setDesc('Template for the file name used when creating a new note for a movie.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.movieFileNameTemplate}`)
					.setValue(this.plugin.settings.movieFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.movieFileNameTemplate = data;
						this.plugin.saveSettings();
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
						this.plugin.saveSettings();
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
						this.plugin.saveSettings();
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
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music Release file name template')
			.setDesc('Template for the file name used when creating a new note for a music release.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.musicReleaseFileNameTemplate}`)
					.setValue(this.plugin.settings.musicReleaseFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.musicReleaseFileNameTemplate = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board Game file name template')
			.setDesc('Template for the file name used when creating a new note for a boardgame.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.boardgameFileNameTemplate}`)
					.setValue(this.plugin.settings.boardgameFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.boardgameFileNameTemplate = data;
						this.plugin.saveSettings();
					});
			});
		// endregion

		// region Property Mappings

		containerEl.createEl('h3', { text: 'Property Mappings' });

		const propertyMappingExplanation = containerEl.createEl('div');
		propertyMappingExplanation.innerHTML = `
		<p>Allow you to remap the metadata fields of newly created media db entries.</p>
		<p>
			The different options are:
			<lu>
				<li>"default": does no remapping and keeps the metadata field as it is</li>
				<li>"remap": renames the metadata field to what ever you specify</li>
				<li>"remove": removes the metadata field entirely</li>
			</lu>
		</p>
		<p>
			Don't forget to save your changes using the save button for each individual category.
		</p>`;

		new PropertyMappingModelsComponent({
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
					new Notice(`MDB: Property Mappings for ${model.type} saved successfully.`);
					this.plugin.saveSettings();
				},
			},
		});

		// endregion
	}
}
