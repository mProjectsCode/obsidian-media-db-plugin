import {Notice, Plugin, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, MediaDbPluginSettings, MediaDbSettingTab} from './settings/Settings';
import {APIManager} from './api/APIManager';
import {TestAPI} from './api/apis/TestAPI';
import {MediaTypeModel} from './models/MediaTypeModel';
import {replaceIllegalFileNameCharactersInString} from './utils/Utils';
import {OMDbAPI} from './api/apis/OMDbAPI';
import {MediaDbAdvancedSearchModal} from './modals/MediaDbAdvancedSearchModal';
import {MediaDbSearchResultModal} from './modals/MediaDbSearchResultModal';
import {MALAPI} from './api/apis/MALAPI';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;
	apiManager: APIManager;

	async onload() {
		await this.loadSettings();

		// add icon to the left ribbon
		const ribbonIconEl = this.addRibbonIcon('database', 'Add new Media DB entry', (evt: MouseEvent) =>
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
		this.apiManager.registerAPI(new OMDbAPI(this));
		this.apiManager.registerAPI(new MALAPI(this));
	}

	async createMediaDbNote(): Promise<void> {
		try {
			let data: MediaTypeModel = await this.openMediaDbSearchModal();
			console.log('MDB | Creating new note...');

			data = await this.apiManager.queryDetailedInfo(data);

			console.log(data);

			data.toMetaData();

			let fileContent = `---\n${data.toMetaData()}---\n`;

			if (data.type === 'movie' && this.settings.movieTemplate) {
				const templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.movieTemplate).first();
				if (templateFile) {
					let template = await this.app.vault.read(templateFile);
					// console.log(template);
					fileContent += template;
				}
			} else if (data.type === 'series' && this.settings.seriesTemplate) {
				const templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.seriesTemplate).first();
				if (templateFile) {
					let template = await this.app.vault.read(templateFile);
					// console.log(template);
					fileContent += template;
				}
			}

			const fileName = replaceIllegalFileNameCharactersInString(data.getFileName());
			const filePath = `${this.settings.folder.replace(/\/$/, '')}/${fileName}.md`;
			const targetFile = await this.app.vault.create(filePath, fileContent);

			// open file
			const activeLeaf = this.app.workspace.getLeaf();
			if (!activeLeaf) {
				console.warn('No active leaf');
				return;
			}
			await activeLeaf.openFile(targetFile, {state: {mode: 'source'}});
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}
	}

	async openMediaDbSearchModal(): Promise<MediaTypeModel> {
		return new Promise(((resolve, reject) => {
			new MediaDbAdvancedSearchModal(this.app, this.apiManager, (err, results) => {
				if (err) return reject(err);
				new MediaDbSearchResultModal(this.app, results, (err2, res) => {
					if (err) return reject(err2);
					resolve(res);
				}).open();
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
