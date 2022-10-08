import {MediaDbAdvancedSearchModal} from '../modals/MediaDbAdvancedSearchModal';
import {MediaDbIdSearchModal} from '../modals/MediaDbIdSearchModal';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {MediaDbSearchResultModal} from '../modals/MediaDbSearchResultModal';
import {Notice} from 'obsidian';
import MediaDbPlugin from '../main';
import { MediaDbPreviewModal } from 'src/modals/MediaDbPreviewModal';

interface AdvancedSearchOptions {
	query: string,
	apis: string[],
}

interface IdSearchOptions {
	query: string,
	api: string,
}

export class ModalHelper {
	plugin: MediaDbPlugin;


	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	async createAdvancedSearchModal(): Promise<{ advancedSearchOptions: AdvancedSearchOptions, advancedSearchModal: MediaDbAdvancedSearchModal }> {
		const modal = new MediaDbAdvancedSearchModal(this.plugin);
		const res: { query: string, apis: string[] } = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return {advancedSearchOptions: res, advancedSearchModal: modal};
	}

	async openAdvancedSearchModal<T>(submitCallback: (advancedSearchOptions: AdvancedSearchOptions) => Promise<T>): Promise<T> {
		const {advancedSearchOptions, advancedSearchModal} = await this.createAdvancedSearchModal();
		if (!advancedSearchOptions) {
			advancedSearchModal.close();
			return;
		}

		try {
			let callbackRes: T;
			callbackRes = await submitCallback(advancedSearchOptions);
			advancedSearchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			advancedSearchModal.close();
			return undefined;
		}
	}

	async createIdSearchModal(): Promise<{ idSearchOptions: { query: string, api: string }, idSearchModal: MediaDbIdSearchModal }> {
		const modal = new MediaDbIdSearchModal(this.plugin);
		const res: { query: string, api: string } = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return {idSearchOptions: res, idSearchModal: modal};
	}

	async openIdSearchModal<T>(submitCallback: (idSearchOptions: IdSearchOptions) => Promise<T>): Promise<T> {
		const {idSearchOptions, idSearchModal} = await this.createIdSearchModal();
		if (!idSearchOptions) {
			idSearchModal.close();
			return;
		}

		try {
			let callbackRes: T;
			callbackRes = await submitCallback(idSearchOptions);
			idSearchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			idSearchModal.close();
			return undefined;
		}
	}

	async createSelectModal(resultsToDisplay: MediaTypeModel[], skipButton: boolean = false, allowMultiSelect: boolean = true): Promise<{ selectRes: MediaTypeModel[], selectModal: MediaDbSearchResultModal }> {
		const modal = new MediaDbSearchResultModal(this.plugin, resultsToDisplay, skipButton, allowMultiSelect);
		const res: MediaTypeModel[] = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setSkipCallback(() => resolve([]));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return {selectRes: res, selectModal: modal};
	}

	async openSelectModal(mediaModels: MediaTypeModel[], submitCallback: (selectedMediaTypeModels: MediaTypeModel[]) => Promise<MediaTypeModel[]>): Promise<MediaTypeModel[]> {
		const {selectRes, selectModal} = await this.createSelectModal(mediaModels, false);
		if (!selectRes) {
			selectModal.close();
			return;
		}

		try {
			let callbackRes: MediaTypeModel[];
			callbackRes = await submitCallback(selectRes);
			selectModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			selectModal.close();
			return;
		}
	}

	async createPreviewModal(mediaTypeModel: MediaTypeModel[]): Promise<{ result: boolean, previewModal: MediaDbPreviewModal }> {
		//todo: handle attachFile for existing files
		const modal = new MediaDbPreviewModal(this.plugin, mediaTypeModel, { attachTemplate: true, attachFile: false });
		const booleanResult: boolean = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return { result: booleanResult, previewModal: modal };
	}

	async openPreviewModal(mediaModels: MediaTypeModel[], submitCallback: (result: boolean) => Promise<boolean>): Promise<boolean> {
		const { result, previewModal } = await this.createPreviewModal(mediaModels);
		if (!result) {
			previewModal.close();
			return;
		}

		try {
			let callbackRes: boolean;
			callbackRes = await submitCallback(result);
			previewModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			previewModal.close();
			return;
		}
	}
}

