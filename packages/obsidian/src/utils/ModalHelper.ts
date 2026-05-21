import type MediaDbPlugin from 'packages/obsidian/src/main';
import { MediaDbAdvancedSearchModal } from 'packages/obsidian/src/modals/MediaDbAdvancedSearchModal';
import { MediaDbIdSearchModal } from 'packages/obsidian/src/modals/MediaDbIdSearchModal';
import { MediaDbPreviewModal } from 'packages/obsidian/src/modals/MediaDbPreviewModal';
import { MediaDbSearchModal } from 'packages/obsidian/src/modals/MediaDbSearchModal';
import { MediaDbSearchResultModal } from 'packages/obsidian/src/modals/MediaDbSearchResultModal';
import type { SeasonSelectModalElement } from 'packages/obsidian/src/modals/MediaDbSeasonSelectModal';
import { MediaDbSeasonSelectModal } from 'packages/obsidian/src/modals/MediaDbSeasonSelectModal';
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

export interface SeasonSelectModalOptions {
	seasons?: SeasonSelectModalElement[];
	multiSelect?: boolean;
	seriesName?: string;
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

interface CloseAwareModal extends ModalLifecycle {
	setCloseCb(closeCallback: (err?: Error) => void): void;
}

interface SubmitModal<TData> extends CloseAwareModal {
	setSubmitCb(submitCallback: (res: TData) => void): void;
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
				if (!resolved) {
					if (result.status === OutcomeStatus.Cancelled && !closeRequested) {
						cancelledByUser = true;
					}

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

	private createCloseOutcome(err: Error | undefined, message: string): Outcome<never, MDBError> {
		if (err) {
			return failure(toMdbError(err, { kind: MDBErrorKind.Modal, message }));
		}

		return cancelled();
	}

	private async openSubmitModalSession<TData, TModal extends SubmitModal<TData>>(
		createModal: () => TModal,
		closeErrorMessage: string,
		wireExtraHandlers?: (modal: TModal, resolve: (result: Outcome<TData, MDBError>) => void) => void,
	): Promise<ModalSession<TData, TModal>> {
		return await this.openModalCore<TData, TModal>(createModal, (modal, resolve) => {
			modal.setSubmitCb(res => resolve(success(res)));
			modal.setCloseCb(err => resolve(this.createCloseOutcome(err, closeErrorMessage)));
			wireExtraHandlers?.(modal, resolve);
		});
	}

	private async resolveModalSessionOutcome<TData, TModal extends ModalLifecycle>(
		sessionPromise: Promise<ModalSession<TData, TModal>>,
		closeOn: readonly OutcomeStatus[] = [OutcomeStatus.Ok],
	): Promise<Outcome<TData, MDBError>> {
		const session = await sessionPromise;
		const { modalResult } = session;

		if (closeOn.includes(modalResult.status)) {
			session.close();
		}

		return modalResult;
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
		return await this.resolveModalSessionOutcome(this.createSearchModalSession(searchModalOptions));
	}

	async createSearchModalSession(searchModalOptions: SearchModalOptions): Promise<ModalSession<SearchModalData, MediaDbSearchModal>> {
		return await this.openSubmitModalSession<SearchModalData, MediaDbSearchModal>(
			() => new MediaDbSearchModal(this.plugin, searchModalOptions),
			'Search modal closed with an error',
		);
	}

	async promptSearchModal(searchModalOptions: SearchModalOptions): Promise<SearchModalData | undefined> {
		return await this.resolveOutcome(this.createSearchModalOutcome(searchModalOptions));
	}

	async createAdvancedSearchModalOutcome(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<Outcome<AdvancedSearchModalData, MDBError>> {
		return await this.resolveModalSessionOutcome(this.createAdvancedSearchModalSession(advancedSearchModalOptions));
	}

	async createAdvancedSearchModalSession(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<ModalSession<AdvancedSearchModalData, MediaDbAdvancedSearchModal>> {
		return await this.openSubmitModalSession<AdvancedSearchModalData, MediaDbAdvancedSearchModal>(
			() => new MediaDbAdvancedSearchModal(this.plugin, advancedSearchModalOptions),
			'Advanced search modal closed with an error',
		);
	}

	async promptAdvancedSearchModal(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<AdvancedSearchModalData | undefined> {
		return await this.resolveOutcome(this.createAdvancedSearchModalOutcome(advancedSearchModalOptions));
	}

	async createIdSearchModalOutcome(idSearchModalOptions: IdSearchModalOptions): Promise<Outcome<IdSearchModalData, MDBError>> {
		return await this.resolveModalSessionOutcome(this.createIdSearchModalSession(idSearchModalOptions));
	}

	async createIdSearchModalSession(idSearchModalOptions: IdSearchModalOptions): Promise<ModalSession<IdSearchModalData, MediaDbIdSearchModal>> {
		return await this.openSubmitModalSession<IdSearchModalData, MediaDbIdSearchModal>(
			() => new MediaDbIdSearchModal(this.plugin, idSearchModalOptions),
			'Id search modal closed with an error',
		);
	}

	async promptIdSearchModal(idSearchModalOptions: IdSearchModalOptions): Promise<IdSearchModalData | undefined> {
		return await this.resolveOutcome(this.createIdSearchModalOutcome(idSearchModalOptions));
	}

	async createSelectModalOutcome(selectModalOptions: SelectModalOptions): Promise<Outcome<SelectModalData, MDBError>> {
		return await this.resolveModalSessionOutcome(
			this.openSubmitModalSession<SelectModalData, MediaDbSearchResultModal>(
				() => new MediaDbSearchResultModal(this.plugin, selectModalOptions),
				'Select modal closed with an error',
				(modal, resolve) => {
					modal.setSkipCallback(() => resolve(skipped()));
				},
			),
			[OutcomeStatus.Ok, OutcomeStatus.Skipped],
		);
	}

	async promptSelectModal(selectModalOptions: SelectModalOptions): Promise<SelectModalData | undefined> {
		return await this.resolveOutcome(this.createSelectModalOutcome(selectModalOptions));
	}

	async createPreviewModalOutcome(previewModalOptions: PreviewModalOptions): Promise<Outcome<PreviewModalData, MDBError>> {
		return await this.resolveModalSessionOutcome(
			this.openSubmitModalSession<PreviewModalData, MediaDbPreviewModal>(
				() => new MediaDbPreviewModal(this.plugin, previewModalOptions),
				'Preview modal closed with an error',
			),
		);
	}

	async promptPreviewModal(previewModalOptions: PreviewModalOptions): Promise<PreviewModalData | undefined> {
		return await this.resolveOutcome(this.createPreviewModalOutcome(previewModalOptions));
	}

	async createSeasonSelectModalOutcome(seasonSelectModalOptions: SeasonSelectModalOptions): Promise<Outcome<SeasonSelectModalElement[], MDBError>> {
		return await this.resolveModalSessionOutcome(
			this.openSubmitModalSession<SeasonSelectModalElement[], MediaDbSeasonSelectModal>(
				() =>
					new MediaDbSeasonSelectModal(
						this.plugin,
						seasonSelectModalOptions.seasons ?? [],
						seasonSelectModalOptions.multiSelect ?? true,
						seasonSelectModalOptions.seriesName,
					),
				'Season select modal closed with an error',
			),
		);
	}

	async promptSeasonSelectModal(seasonSelectModalOptions: SeasonSelectModalOptions): Promise<SeasonSelectModalElement[] | undefined> {
		return await this.resolveOutcome(this.createSeasonSelectModalOutcome(seasonSelectModalOptions));
	}
}
