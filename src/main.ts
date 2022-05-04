import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MediaDbPluginSettings, MediaDbSettingTab} from './settings/settings';
import {MediaDbSearchModal} from './modals/MediaDbSearchModal';
import {APIManager} from './api/APIManager';
import {TestAPI} from './api/apis/TestAPI';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;
	apiManager: APIManager;

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


		this.apiManager = new APIManager();
		// register APIs
		this.apiManager.registerAPI(new TestAPI());
	}

	async createMediaDbNote(): Promise<void> {
		const data = await this.openMediaDbSearchModal();
		console.log('MDB | Create new note or something...');
		console.log(data);
	}

	async openMediaDbSearchModal(): Promise<any> {
		return new Promise(((resolve, reject) => {
			new MediaDbSearchModal(this.app, this.apiManager, (err, result) => {
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
