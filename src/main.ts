import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MediaDbPluginSettings, MediaDbSettingTab} from './settings/settings';
import {MediaDbSearchModal} from './modals/MediaDbSearchModal';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;

	async onload() {
		await this.loadSettings();

		// add icon to the left ribbon
		const ribbonIconEl = this.addRibbonIcon('book', 'Add new Media DB entry', (evt: MouseEvent) =>
			this.createMediaDbNote(),
		);
		ribbonIconEl.addClass('obsidian-media-db-plugin-ribbon-class');

		// register command to open search modal
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Add new Media DB entry',
			callback: () => this.createMediaDbNote(),
		});

		// register the settings tab
		this.addSettingTab(new MediaDbSettingTab(this.app, this));
	}

	async createMediaDbNote(): Promise<void> {
		const data = await this.openMediaDbSearchModal();
		console.log('Create new note or something...');
		console.log(data);
	}

	async openMediaDbSearchModal(): Promise<any> {
		return new Promise(((resolve, reject) => {
			new MediaDbSearchModal(this.app, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			}).open();
		}));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
