import {Notice, Plugin, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, MediaDbPluginSettings, MediaDbSettingTab} from './settings/Settings';
import {APIManager} from './api/APIManager';
import {MediaTypeModel} from './models/MediaTypeModel';
import {replaceIllegalFileNameCharactersInString} from './utils/Utils';
import {OMDbAPI} from './api/apis/OMDbAPI';
import {MediaDbAdvancedSearchModal} from './modals/MediaDbAdvancedSearchModal';
import {MediaDbSearchResultModal} from './modals/MediaDbSearchResultModal';
import {MALAPI} from './api/apis/MALAPI';
import {MediaDbIdSearchModal} from './modals/MediaDbIdSearchModal';
import {WikipediaAPI} from './api/apis/WikipediaAPI';
import {MusicBrainzAPI} from './api/apis/MusicBrainzAPI';
import {MediaTypeManager} from './utils/MediaTypeManager';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;
	apiManager: APIManager;
	mediaTypeManager: MediaTypeManager;

	async onload() {
		await this.loadSettings();

		// add icon to the left ribbon
		const ribbonIconEl = this.addRibbonIcon('database', 'Add new Media DB entry', (evt: MouseEvent) =>
			this.createMediaDbNote(this.openMediaDbAdvancedSearchModal.bind(this)),
		);
		ribbonIconEl.addClass('obsidian-media-db-plugin-ribbon-class');

		// register command to open search modal
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Add new Media DB entry',
			callback: () => this.createMediaDbNote(this.openMediaDbAdvancedSearchModal.bind(this)),
		});
		// register command to open id search modal
		this.addCommand({
			id: 'open-media-db-id-search-modal',
			name: 'Add new Media DB entry by id',
			callback: () => this.createMediaDbNote(this.openMediaDbIdSearchModal.bind(this)),
		});
		// register command to update the open note
		this.addCommand({
			id: 'update-media-db-note',
			name: 'Update the open note, if it is a Media DB entry.',
			callback: () => this.updateActiveNote(),
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

		this.mediaTypeManager = new MediaTypeManager(this.settings);
	}

	async createMediaDbNote(modal: () => Promise<MediaTypeModel>): Promise<void> {
		try {
			let data: MediaTypeModel = await modal();
			data = await this.apiManager.queryDetailedInfo(data);

			await this.createMediaDbNoteFromModel(data);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}
	}

	async createMediaDbNoteFromModel(mediaTypeModel: MediaTypeModel): Promise<void> {
		try {
			console.log('MDB | Creating new note...');
			// console.log(mediaTypeModel);

			let fileContent = `---\n${mediaTypeModel.toMetaData()}---\n`;

			if (this.settings.templates) {
				fileContent += await this.mediaTypeManager.getContent(mediaTypeModel, this.app);
			}

			const fileName = replaceIllegalFileNameCharactersInString(this.mediaTypeManager.getFileName(mediaTypeModel));
			const filePath = `${this.settings.folder.replace(/\/$/, '')}/${fileName}.md`;

			await this.app.vault.delete(this.app.vault.getAbstractFileByPath(filePath));
			const targetFile = await this.app.vault.create(filePath, fileContent);

			// open file
			const activeLeaf = this.app.workspace.getUnpinnedLeaf();
			if (!activeLeaf) {
				console.warn('MDB | no active leaf, not opening media db note');
				return;
			}
			await activeLeaf.openFile(targetFile, {state: {mode: 'source'}});

		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}
	}

	async openMediaDbAdvancedSearchModal(): Promise<MediaTypeModel> {
		return new Promise(((resolve, reject) => {
			new MediaDbAdvancedSearchModal(this.app, this, (err, results) => {
				if (err) return reject(err);
				new MediaDbSearchResultModal(this.app, this, results, (err2, res) => {
					if (err2) return reject(err2);
					resolve(res);
				}).open();
			}).open();
		}));
	}

	async openMediaDbIdSearchModal(): Promise<MediaTypeModel> {
		return new Promise(((resolve, reject) => {
			new MediaDbIdSearchModal(this.app, this, (err, res) => {
				if (err) return reject(err);
				resolve(res);
			}).open();
		}));
	}

	async updateActiveNote() {
		const activeLeaf: TFile = this.app.workspace.getActiveFile();
		if (!activeLeaf.name) return;

		let metadata = this.app.metadataCache.getFileCache(activeLeaf).frontmatter;

		if (!metadata.type || !metadata.dataSource || !metadata.id) {
			throw new Error('MDB | active note is not a Media DB entry or is missing metadata');
		}

		const newMetadata = await this.apiManager.queryDetailedInfo({dataSource: metadata.dataSource, id: metadata.id} as MediaTypeModel);

		if (!newMetadata) {
			return;
		}

		console.log('MDB | deleting old entry');
		await this.app.vault.delete(activeLeaf);
		await this.createMediaDbNoteFromModel(newMetadata);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		this.mediaTypeManager.updateTemplates(this.settings);
		await this.saveData(this.settings);
	}
}
