import {App, PluginSettingTab, Setting} from 'obsidian';

import MediaDbPlugin from '../main';
import {FolderSuggest} from './suggesters/FolderSuggester';


export interface MediaDbPluginSettings {
	folder: string,
	OMDbKey: string,
}

export const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	folder: '',
	OMDbKey: '',
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
	}

}
