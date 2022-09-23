import {App, PluginSettingTab, Setting} from 'obsidian';

import MediaDbPlugin from '../main';
import {FolderSuggest} from './suggesters/FolderSuggest';
import {FileSuggest} from './suggesters/FileSuggest';
import PropertyBindingsComponent from './PropertyBindingsComponent.svelte';
import {PropertyMapping, PropertyMappingModel, PropertyMappingOption} from './PropertyMapping';
import {MediaType} from '../utils/MediaType';


export interface MediaDbPluginSettings {
	folder: string,
	OMDbKey: string,
	sfwFilter: boolean,
	useCustomYamlStringifier: boolean;
	templates: boolean,


	movieTemplate: string,
	seriesTemplate: string,
	gameTemplate: string,
	wikiTemplate: string,
	musicReleaseTemplate: string,
	boardgameTemplate: string,

	movieFileNameTemplate: string,
	seriesFileNameTemplate: string,
	gameFileNameTemplate: string,
	wikiFileNameTemplate: string,
	musicReleaseFileNameTemplate: string,
	boardgameFileNameTemplate: string,

	moviePropertyConversionRules: string,
	seriesPropertyConversionRules: string,
	gamePropertyConversionRules: string,
	wikiPropertyConversionRules: string,
	musicReleasePropertyConversionRules: string,
	boardgamePropertyConversionRules: string,

	propertyMappings: PropertyMappingModel[],

}

export const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	folder: 'Media DB',
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

	propertyMappings: [
		{
			type: MediaType.Movie,
			properties: [
				new PropertyMapping('type', '', PropertyMappingOption.None, true),
				new PropertyMapping('subType', '', PropertyMappingOption.None),
				new PropertyMapping('title', '', PropertyMappingOption.None),
				new PropertyMapping('englishTitle', '', PropertyMappingOption.None),
				new PropertyMapping('year', '', PropertyMappingOption.None),
				new PropertyMapping('dataSource', '', PropertyMappingOption.None, true),
				new PropertyMapping('url', '', PropertyMappingOption.None),
				new PropertyMapping('id', '', PropertyMappingOption.None, true),

				new PropertyMapping('genres', '', PropertyMappingOption.None),
				new PropertyMapping('producer', '', PropertyMappingOption.None),
				new PropertyMapping('duration', '', PropertyMappingOption.None),
				new PropertyMapping('onlineRating', '', PropertyMappingOption.None),
				new PropertyMapping('image', '', PropertyMappingOption.None),
				new PropertyMapping('released', '', PropertyMappingOption.None),
				new PropertyMapping('premiere', '', PropertyMappingOption.None),
				new PropertyMapping('watched', '', PropertyMappingOption.None),
				new PropertyMapping('lastWatched', '', PropertyMappingOption.None),
				new PropertyMapping('personalRating', '', PropertyMappingOption.None),
			],
		},
		{
			type: MediaType.Series,
			properties: [
				new PropertyMapping('type', '', PropertyMappingOption.None, true),
				new PropertyMapping('subType', '', PropertyMappingOption.None),
				new PropertyMapping('title', '', PropertyMappingOption.None),
				new PropertyMapping('englishTitle', '', PropertyMappingOption.None),
				new PropertyMapping('year', '', PropertyMappingOption.None),
				new PropertyMapping('dataSource', '', PropertyMappingOption.None, true),
				new PropertyMapping('url', '', PropertyMappingOption.None),
				new PropertyMapping('id', '', PropertyMappingOption.None, true),

				new PropertyMapping('genres', '', PropertyMappingOption.None),
				new PropertyMapping('studios', '', PropertyMappingOption.None),
				new PropertyMapping('episodes', '', PropertyMappingOption.None),
				new PropertyMapping('duration', '', PropertyMappingOption.None),
				new PropertyMapping('onlineRating', '', PropertyMappingOption.None),
				new PropertyMapping('image', '', PropertyMappingOption.None),
				new PropertyMapping('released', '', PropertyMappingOption.None),
				new PropertyMapping('airing', '', PropertyMappingOption.None),
				new PropertyMapping('airedFrom', '', PropertyMappingOption.None),
				new PropertyMapping('airedTo', '', PropertyMappingOption.None),
				new PropertyMapping('watched', '', PropertyMappingOption.None),
				new PropertyMapping('lastWatched', '', PropertyMappingOption.None),
				new PropertyMapping('personalRating', '', PropertyMappingOption.None),
			],
		},
	],

};

export class MediaDbSettingTab extends PluginSettingTab {
	plugin: MediaDbPlugin;

	constructor(app: App, plugin: MediaDbPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Media DB Plugin Settings'});

		new Setting(containerEl)
			.setName('New file location')
			.setDesc('New media db entries will be placed here.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.folder)
					.onChange(data => {
						this.plugin.settings.folder = data;
						this.plugin.saveSettings();
					});
			});

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
				cb.setValue(this.plugin.settings.sfwFilter)
					.onChange(data => {
						this.plugin.settings.sfwFilter = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('YAML formatter')
			.setDesc('Add optional quotation marks around strings in the metadata block.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.useCustomYamlStringifier)
					.onChange(data => {
						this.plugin.settings.useCustomYamlStringifier = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Resolve {{ tags }} in templates')
			.setDesc('Whether to resolve {{ tags }} in templates. The spaces inside the curly braces are important.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.templates)
					.onChange(data => {
						this.plugin.settings.templates = data;
						this.plugin.saveSettings();
					});
			});


		containerEl.createEl('h3', {text: 'Template Settings'});
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

		containerEl.createEl('h3', {text: 'File Name Settings'});
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

		containerEl.createEl('h3', {text: 'Property Mappings'});
		// region Property Mappings
		/*
		new Setting(containerEl)
			.setName('Movie model property mappings')
			.setDesc('Mappings for the property names of a movie.')
			.addTextArea(cb => {
				cb.setPlaceholder(`Example: \ntitle -> name\nyear -> releaseYear`)
					.setValue(this.plugin.settings.moviePropertyConversionRules)
					.onChange(data => {
						this.plugin.settings.moviePropertyConversionRules = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series model property mappings')
			.setDesc('Mappings for the property names of a series.')
			.addTextArea(cb => {
				cb.setPlaceholder(`Example: \ntitle -> name\nyear -> releaseYear`)
					.setValue(this.plugin.settings.seriesPropertyConversionRules)
					.onChange(data => {
						this.plugin.settings.seriesPropertyConversionRules = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game model property mappings')
			.setDesc('Mappings for the property names of a game.')
			.addTextArea(cb => {
				cb.setPlaceholder(`Example: \ntitle -> name\nyear -> releaseYear`)
					.setValue(this.plugin.settings.gamePropertyConversionRules)
					.onChange(data => {
						this.plugin.settings.gamePropertyConversionRules = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki model property mappings')
			.setDesc('Mappings for the property names of a wiki entry.')
			.addTextArea(cb => {
				cb.setPlaceholder(`Example: \ntitle -> name\nyear -> releaseYear`)
					.setValue(this.plugin.settings.wikiPropertyConversionRules)
					.onChange(data => {
						this.plugin.settings.wikiPropertyConversionRules = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music Release model property mappings')
			.setDesc('Mappings for the property names of a music release.')
			.addTextArea(cb => {
				cb.setPlaceholder(`Example: \ntitle -> name\nyear -> releaseYear`)
					.setValue(this.plugin.settings.musicReleasePropertyConversionRules)
					.onChange(data => {
						this.plugin.settings.musicReleasePropertyConversionRules = data;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board Game model property mappings')
			.setDesc('Mappings for the property names of a boardgame.')
			.addTextArea(cb => {
				cb.setPlaceholder(`Example: \ntitle -> name\nyear -> releaseYear`)
					.setValue(this.plugin.settings.boardgamePropertyConversionRules)
					.onChange(data => {
						this.plugin.settings.boardgamePropertyConversionRules = data;
						this.plugin.saveSettings();
					});
			});

		 */
		// endregion

		console.log(this.plugin.settings.propertyMappings);

		new PropertyBindingsComponent({
			target: this.containerEl,
			props: {
				models: this.plugin.settings.propertyMappings,
				save: (models: PropertyMappingModel[]) => {
					this.plugin.settings.propertyMappings = models;
					this.plugin.saveSettings();
				},
			},
		});

	}

}
