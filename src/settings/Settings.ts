import {App, PluginSettingTab, Setting} from 'obsidian';

import MediaDbPlugin from '../main';
import {FolderSuggest} from './suggesters/FolderSuggester';
import {FileSuggest} from './suggesters/FileSuggester';


export interface MediaDbPluginSettings {
	folder: string,
	sfwFilter: boolean,
	OMDbKey: string,
	movieTemplate: string,
	seriesTemplate: string,
}

export const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	folder: '',
	sfwFilter: true,
	OMDbKey: '',
	movieTemplate: '',
	seriesTemplate: '',
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
	}

}
