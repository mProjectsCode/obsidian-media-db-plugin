import type MediaDbPlugin from 'packages/obsidian/src/main';
import { MediaDbAdvancedSearchModal } from 'packages/obsidian/src/modals/MediaDbAdvancedSearchModal';
import { MediaDbIdSearchModal } from 'packages/obsidian/src/modals/MediaDbIdSearchModal';
import { MediaDbPreviewModal } from 'packages/obsidian/src/modals/MediaDbPreviewModal';
import { MediaDbSearchModal } from 'packages/obsidian/src/modals/MediaDbSearchModal';
import { MediaDbSearchResultModal } from 'packages/obsidian/src/modals/MediaDbSearchResultModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import type { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Outcome } from 'packages/obsidian/src/utils/result';
import { cancelled, failure, OutcomeStatus, skipped, success } from 'packages/obsidian/src/utils/result';

export interface SearchModalData {
	query: string;
	types: MediaType[];
}

export interface AdvancedSearchModalData {
	query: string;
	apis: string[];
}

export interface IdSearchModalData {
	query: string;
	api: string;
}

export interface SelectModalData {
	selected: MediaTypeModel[];
}

export interface PreviewModalData {
	confirmed: boolean;
}

export interface SearchModalOptions {
	modalTitle?: string;
	preselectedTypes?: MediaType[];
	prefilledSearchString?: string;
}

export interface AdvancedSearchModalOptions {
	modalTitle?: string;
	preselectedAPIs?: string[];
	prefilledSearchString?: string;
}

export interface IdSearchModalOptions {
	modalTitle?: string;
	preselectedAPI?: string;
	prefilledSearchString?: string;
}

export interface SelectModalOptions {
	elements?: MediaTypeModel[];
	multiSelect?: boolean;
	modalTitle?: string;
	skipButton?: boolean;
	description?: string;
	submitButtonText?: string;
}

export interface PreviewModalOptions {
	modalTitle?: string;
	elements?: MediaTypeModel[];
}

export const SEARCH_MODAL_DEFAULT_OPTIONS: SearchModalOptions = {
	modalTitle: 'Media DB Search',
	preselectedTypes: [],
	prefilledSearchString: '',
};

export const ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS: AdvancedSearchModalOptions = {
	modalTitle: 'Media DB Advanced Search',
	preselectedAPIs: [],
	prefilledSearchString: '',
};

export const ID_SEARCH_MODAL_DEFAULT_OPTIONS: IdSearchModalOptions = {
	modalTitle: 'Media DB Id Search',
	preselectedAPI: undefined,
	prefilledSearchString: '',
};

export const SELECT_MODAL_OPTIONS_DEFAULT: SelectModalOptions = {
	modalTitle: 'Media DB Search Results',
	elements: [],
	multiSelect: true,
	skipButton: false,
};

export const PREVIEW_MODAL_DEFAULT_OPTIONS: PreviewModalOptions = {
	modalTitle: 'Media DB Preview',
	elements: [],
};

export const SELECTMODALOPTIONSDEFAULT: SelectModalOptions = {
	elements: [],
	multiSelect: true,
	modalTitle: '',
	skipButton: false,
	description: 'Select one or multiple search results.',
	submitButtonText: 'Ok',
};

export interface ModalLifecycle {
	open(): void;
	close(): void;
}

export interface ModalSession<T, TModal extends ModalLifecycle> {
	modalResult: Outcome<T, MDBError>;
	modal: TModal;
	close(): void;
	isCancelled(): boolean;
}

export class ModalHelper {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	private async openModalCore<TData, TModal extends ModalLifecycle>(
		createModal: () => TModal,
		wireHandlers: (modal: TModal, resolve: (result: Outcome<TData, MDBError>) => void) => void,
	): Promise<ModalSession<TData, TModal>> {
		const modal = createModal();
		let closeRequested = false;
		let cancelledByUser = false;
		let resolved = false;
		const modalResult = await new Promise<Outcome<TData, MDBError>>(resolve => {
			const resolveSession = (result: Outcome<TData, MDBError>): void => {
				if (result.status === OutcomeStatus.Cancelled && !closeRequested) {
					cancelledByUser = true;
				}

				if (!resolved) {
					resolved = true;
					resolve(result);
				}
			};

			wireHandlers(modal, resolveSession);
			modal.open();
		});

		return {
			modalResult,
			modal,
			close: (): void => {
				closeRequested = true;
				modal.close();
			},
			isCancelled: (): boolean => cancelledByUser,
		};
	}

	private async resolveOutcome<T>(outcomePromise: Promise<Outcome<T, MDBError>>): Promise<T | undefined> {
		const outcome = await outcomePromise;

		if (outcome.status === OutcomeStatus.Ok) {
			return outcome.data;
		}

		if (outcome.status === OutcomeStatus.Error) {
			this.plugin.errorReporter.report(outcome.error);
		}

		return undefined;
	}

	async runModalTask<TData, TModal extends ModalLifecycle, TResult>(
		session: ModalSession<TData, TModal>,
		task: () => Promise<TResult>,
		errorFallback: MDBError = { kind: MDBErrorKind.Modal, message: 'Modal task failed' },
	): Promise<Outcome<TResult, MDBError>> {
		try {
			const result = await task();

			if (session.isCancelled()) {
				return cancelled();
			}

			return success(result);
		} catch (err) {
			if (session.isCancelled()) {
				return cancelled();
			}

			return failure(toMdbError(err, errorFallback));
		} finally {
			if (!session.isCancelled()) {
				session.close();
			}
		}
	}

	async createSearchModalOutcome(searchModalOptions: SearchModalOptions): Promise<Outcome<SearchModalData, MDBError>> {
		const session = await this.createSearchModalSession(searchModalOptions);
		const { modalResult } = session;

		if (modalResult.status === OutcomeStatus.Ok) {
			session.close();
		}

		return modalResult;
	}

	async createSearchModalSession(searchModalOptions: SearchModalOptions): Promise<ModalSession<SearchModalData, MediaDbSearchModal>> {
		return await this.openModalCore<SearchModalData, MediaDbSearchModal>(
			() => new MediaDbSearchModal(this.plugin, searchModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toMdbError(err, { kind: MDBErrorKind.Modal, message: 'Search modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);
	}

	async promptSearchModal(searchModalOptions: SearchModalOptions): Promise<SearchModalData | undefined> {
		return await this.resolveOutcome(this.createSearchModalOutcome(searchModalOptions));
	}

	async createAdvancedSearchModalOutcome(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<Outcome<AdvancedSearchModalData, MDBError>> {
		const session = await this.createAdvancedSearchModalSession(advancedSearchModalOptions);
		const { modalResult } = session;

		if (modalResult.status === OutcomeStatus.Ok) {
			session.close();
		}

		return modalResult;
	}

	async createAdvancedSearchModalSession(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<ModalSession<AdvancedSearchModalData, MediaDbAdvancedSearchModal>> {
		return await this.openModalCore<AdvancedSearchModalData, MediaDbAdvancedSearchModal>(
			() => new MediaDbAdvancedSearchModal(this.plugin, advancedSearchModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toMdbError(err, { kind: MDBErrorKind.Modal, message: 'Advanced search modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);
	}

	async promptAdvancedSearchModal(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<AdvancedSearchModalData | undefined> {
		return await this.resolveOutcome(this.createAdvancedSearchModalOutcome(advancedSearchModalOptions));
	}

	async createIdSearchModalOutcome(idSearchModalOptions: IdSearchModalOptions): Promise<Outcome<IdSearchModalData, MDBError>> {
		const session = await this.createIdSearchModalSession(idSearchModalOptions);
		const { modalResult } = session;

		if (modalResult.status === OutcomeStatus.Ok) {
			session.close();
		}

		return modalResult;
	}

	async createIdSearchModalSession(idSearchModalOptions: IdSearchModalOptions): Promise<ModalSession<IdSearchModalData, MediaDbIdSearchModal>> {
		return await this.openModalCore<IdSearchModalData, MediaDbIdSearchModal>(
			() => new MediaDbIdSearchModal(this.plugin, idSearchModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toMdbError(err, { kind: MDBErrorKind.Modal, message: 'Id search modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);
	}

	async promptIdSearchModal(idSearchModalOptions: IdSearchModalOptions): Promise<IdSearchModalData | undefined> {
		return await this.resolveOutcome(this.createIdSearchModalOutcome(idSearchModalOptions));
	}

	async createSelectModalOutcome(selectModalOptions: SelectModalOptions): Promise<Outcome<SelectModalData, MDBError>> {
		const session = await this.openModalCore<SelectModalData, MediaDbSearchResultModal>(
			() => new MediaDbSearchResultModal(this.plugin, selectModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setSkipCallback(() => resolve(skipped()));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toMdbError(err, { kind: MDBErrorKind.Modal, message: 'Select modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);
		const { modalResult } = session;

		if (modalResult.status === OutcomeStatus.Ok || modalResult.status === OutcomeStatus.Skipped) {
			session.close();
		}

		return modalResult;
	}

	async promptSelectModal(selectModalOptions: SelectModalOptions): Promise<SelectModalData | undefined> {
		return await this.resolveOutcome(this.createSelectModalOutcome(selectModalOptions));
	}

	async createPreviewModalOutcome(previewModalOptions: PreviewModalOptions): Promise<Outcome<PreviewModalData, MDBError>> {
		const session = await this.openModalCore<PreviewModalData, MediaDbPreviewModal>(
			() => new MediaDbPreviewModal(this.plugin, previewModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toMdbError(err, { kind: MDBErrorKind.Modal, message: 'Preview modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);
		const { modalResult } = session;

		if (modalResult.status === OutcomeStatus.Ok) {
			session.close();
		}

		return modalResult;
	}

	async promptPreviewModal(previewModalOptions: PreviewModalOptions): Promise<PreviewModalData | undefined> {
		return await this.resolveOutcome(this.createPreviewModalOutcome(previewModalOptions));
	}
}
