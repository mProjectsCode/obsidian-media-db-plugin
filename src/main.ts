import {Notice, Plugin, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, MediaDbPluginSettings, MediaDbSettingTab} from './settings/Settings';
import {APIManager} from './api/APIManager';
import {MediaTypeModel} from './models/MediaTypeModel';
import {replaceIllegalFileNameCharactersInString, replaceTags} from './utils/Utils';
import {OMDbAPI} from './api/apis/OMDbAPI';
import {MediaDbAdvancedSearchModal} from './modals/MediaDbAdvancedSearchModal';
import {MediaDbSearchResultModal} from './modals/MediaDbSearchResultModal';
import {MALAPI} from './api/apis/MALAPI';
import {MediaDbIdSearchModal} from './modals/MediaDbIdSearchModal';
import {WikipediaAPI} from './api/apis/WikipediaAPI';
import {MusicBrainzAPI} from './api/apis/MusicBrainzAPI';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;
	apiManager: APIManager;

	async onload() {
		await this.loadSettings();

		// add icon to the left ribbon
		const ribbonIconEl = this.addRibbonIcon('database', 'Add new Media DB entry', (evt: MouseEvent) =>
			this.createMediaDbNote(this.openMediaDbSearchModal.bind(this)),
		);
		ribbonIconEl.addClass('obsidian-media-db-plugin-ribbon-class');

		// register command to open search modal
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Add new Media DB entry',
			callback: () => this.createMediaDbNote(this.openMediaDbSearchModal.bind(this)),
		});
		// register command to open id search modal
		this.addCommand({
			id: 'open-media-db-id-search-modal',
			name: 'Add new Media DB entry by id',
			callback: () => this.createMediaDbNote(this.openMediaDbIdSearchModal.bind(this)),
		});

		// register the settings tab
		this.addSettingTab(new MediaDbSettingTab(this.app, this));


		this.apiManager = new APIManager();
		// register APIs
		this.apiManager.registerAPI(new OMDbAPI(this));
		this.apiManager.registerAPI(new MALAPI(this));
		this.apiManager.registerAPI(new WikipediaAPI(this));
		this.apiManager.registerAPI(new MusicBrainzAPI(this));
		// this.apiManager.registerAPI(new LocGovAPI(this)); // TODO: parse data
	}

	async createMediaDbNote(modal: () => Promise<MediaTypeModel>): Promise<void> {
		try {
			let data: MediaTypeModel = await modal();
			console.log('MDB | Creating new note...');

			data = await this.apiManager.queryDetailedInfo(data);

			console.log(data);

			data.toMetaData();

			let fileContent = `---\n${data.toMetaData()}---\n`;

			let templateFile: TFile = null;

			if (data.type === 'movie' && this.settings.movieTemplate) {
				templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.movieTemplate).first();
			} else if (data.type === 'series' && this.settings.seriesTemplate) {
				templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.seriesTemplate).first();
			} else if (data.type === 'game' && this.settings.gameTemplate) {
				templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.gameTemplate).first();
			} else if (data.type === 'wiki' && this.settings.wikiTemplate) {
				templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.wikiTemplate).first();
			} else if (data.type === 'musicRelease' && this.settings.musicReleaseTemplate) {
				templateFile = this.app.vault.getFiles().filter((f: TFile) => f.name === this.settings.musicReleaseTemplate).first();
			}

			if (templateFile) {
				let template = await this.app.vault.read(templateFile);
				// console.log(template);
				if (this.settings.templates) {
					template = replaceTags(template, data);
				}
				fileContent += template;
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
					if (err2) return reject(err2);
					resolve(res);
				}).open();
			}).open();
		}));
	}

	async openMediaDbIdSearchModal(): Promise<MediaTypeModel> {
		return new Promise(((resolve, reject) => {
			new MediaDbIdSearchModal(this.app, this.apiManager, (err, res) => {
				if (err) return reject(err);
				resolve(res);
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
