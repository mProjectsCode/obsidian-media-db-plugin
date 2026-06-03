import type { TFile } from 'obsidian';
import { MarkdownView, Notice } from 'obsidian';
import type { SeasonListAPIModel } from 'packages/obsidian/src/api/APIModel';
import { isSeasonListAPIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { SeasonSelectModalElement } from 'packages/obsidian/src/modals/MediaDbSeasonSelectModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { SeasonModel } from 'packages/obsidian/src/models/SeasonModel';
import { SeasonSearchResultModel } from 'packages/obsidian/src/models/SeasonSearchResultModel';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { ModalLifecycle, ModalSession, SearchModalOptions } from 'packages/obsidian/src/utils/ModalHelper';
import type { Outcome } from 'packages/obsidian/src/utils/result';
import { OutcomeStatus } from 'packages/obsidian/src/utils/result';

export class MediaDbEntryHelper {
	readonly plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	private reportMdbError(error: MDBError): void {
		this.plugin.errorReporter.report(error);
	}

	private getModalData<T>(modalResult: Outcome<T, MDBError>): T | undefined {
		if (modalResult.status === OutcomeStatus.Ok) {
			return modalResult.data;
		}

		if (modalResult.status === OutcomeStatus.Error) {
			this.reportMdbError(modalResult.error);
		}

		return undefined;
	}

	private async runModalQuery<TData, TResult>(session: ModalSession<TData, ModalLifecycle>, query: () => Promise<TResult>): Promise<TResult | undefined> {
		return this.getModalData(await this.plugin.modalHelper.runModalTask(session, query, { kind: MDBErrorKind.Api, message: 'API query failed' }));
	}

	async createLinkWithSearchModal(): Promise<void> {
		const advancedSearchSession = await this.plugin.modalHelper.createAdvancedSearchModalSession({});
		const advancedSearch = this.getModalData(advancedSearchSession.modalResult);
		if (!advancedSearch) {
			return;
		}

		const apiSearchResults = await this.runModalQuery(advancedSearchSession, () => this.plugin.apiManager.query(advancedSearch.query, advancedSearch.apis));
		if (!apiSearchResults) {
			return;
		}

		if (!apiSearchResults.ok) {
			this.reportMdbError(apiSearchResults.error);
			return;
		}

		if (!apiSearchResults.value.items || apiSearchResults.value.items.length === 0) {
			this.reportMdbError({ kind: MDBErrorKind.Validation, message: 'No results found.', userMessage: 'No results found.' });
			return;
		}

		const selectResults = await this.plugin.modalHelper.promptSelectModal({ elements: apiSearchResults.value.items, multiSelect: false });
		if (!selectResults || selectResults.selected.length < 1) {
			return;
		}

		const detailedResults = await this.queryDetails(selectResults.selected);
		if (detailedResults.length < 1) {
			return;
		}

		const link = `[${detailedResults[0].title}](${detailedResults[0].url})`;
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

		if (view) {
			view.editor.replaceRange(link, view.editor.getCursor());
		}
	}

	async createEntryWithSearchModal(searchModalOptions?: SearchModalOptions): Promise<void> {
		const searchSession = await this.plugin.modalHelper.createSearchModalSession(searchModalOptions ?? {});
		const searchData = this.getModalData(searchSession.modalResult);
		if (!searchData) {
			return;
		}

		const types = searchData.types;
		const apis = this.plugin.apiManager.apis.filter(api => api.hasTypeOverlap(types)).map(api => api.apiName);
		const apiSearchResults = await this.runModalQuery(searchSession, () => this.plugin.apiManager.query(searchData.query, apis));
		if (!apiSearchResults) {
			return;
		}

		if (!apiSearchResults.ok) {
			this.reportMdbError(apiSearchResults.error);
			return;
		}

		if (!apiSearchResults.value.items || apiSearchResults.value.items.length === 0) {
			this.reportMdbError({ kind: MDBErrorKind.Validation, message: 'No results found.', userMessage: 'No results found.' });
			return;
		}

		const filteredSearchResults = apiSearchResults.value.items.filter(result => types.includes(result.getMediaType()));
		if (filteredSearchResults.length === 0) {
			this.reportMdbError({ kind: MDBErrorKind.Validation, message: 'No results found for the selected types.', userMessage: 'No results found for the selected types.' });
			return;
		}

		const selectResultsData =
			types.length === 1 && types[0] === MediaType.Season
				? await this.plugin.modalHelper.promptSelectModal({
						elements: filteredSearchResults,
						multiSelect: false,
						description: 'Select one search result to proceed.',
						submitButtonText: 'Ok',
					})
				: await this.plugin.modalHelper.promptSelectModal({ elements: filteredSearchResults });

		if (!selectResultsData) {
			return;
		}

		if ((await this.handleSeasonSearchSelections(selectResultsData.selected)).handled) {
			return;
		}

		const selectResults = await this.queryDetails(selectResultsData.selected);

		if (selectResults.length === 0) {
			return;
		}

		const seasonHandlingResult = await this.handleSeasonWorkflow(types, selectResults);
		if (seasonHandlingResult.handled) {
			return;
		}

		const confirmed = await this.plugin.modalHelper.promptPreviewModal({ elements: selectResults });
		if (!confirmed?.confirmed) {
			return;
		}

		await this.plugin.fileHelper.createMediaDbNotes(selectResults);
	}

	async createEntryWithAdvancedSearchModal(): Promise<void> {
		const advancedSearchSession = await this.plugin.modalHelper.createAdvancedSearchModalSession({});
		const advancedSearch = this.getModalData(advancedSearchSession.modalResult);
		if (!advancedSearch) {
			return;
		}

		const apiSearchResults = await this.runModalQuery(advancedSearchSession, () => this.plugin.apiManager.query(advancedSearch.query, advancedSearch.apis));
		if (!apiSearchResults) {
			return;
		}

		if (!apiSearchResults.ok) {
			this.reportMdbError(apiSearchResults.error);
			return;
		}

		if (!apiSearchResults.value.items || apiSearchResults.value.items.length === 0) {
			this.reportMdbError({ kind: MDBErrorKind.Validation, message: 'No results found.', userMessage: 'No results found.' });
			return;
		}

		const selectResultsData = await this.plugin.modalHelper.promptSelectModal({ elements: apiSearchResults.value.items });
		if (!selectResultsData) {
			return;
		}

		if ((await this.handleSeasonSearchSelections(selectResultsData.selected)).handled) {
			return;
		}

		const selectResults = await this.queryDetails(selectResultsData.selected);
		if (selectResults.length < 1) {
			return;
		}

		const confirmed = await this.plugin.modalHelper.promptPreviewModal({ elements: selectResults });
		if (!confirmed?.confirmed) {
			return;
		}

		await this.plugin.fileHelper.createMediaDbNotes(selectResults);
	}

	async createEntryWithIdSearchModal(): Promise<void> {
		let idSearchResult: MediaTypeModel | undefined = undefined;
		let proceed = false;

		while (!proceed) {
			const idSearchSession = await this.plugin.modalHelper.createIdSearchModalSession({});
			const idSearchData = this.getModalData(idSearchSession.modalResult);
			if (!idSearchData) {
				return;
			}

			const queriedIdResult = await this.runModalQuery(idSearchSession, () => this.plugin.apiManager.queryDetailedInfoById(idSearchData.query, idSearchData.api));
			if (!queriedIdResult) {
				return;
			}

			if (!queriedIdResult.ok) {
				this.reportMdbError(queriedIdResult.error);
				return;
			}

			idSearchResult = queriedIdResult.value;
			if (!idSearchResult) {
				return;
			}

			const previewData = await this.plugin.modalHelper.promptPreviewModal({ elements: [idSearchResult] });
			if (!previewData) {
				return;
			}

			proceed = previewData.confirmed;
		}

		if (!idSearchResult) {
			return;
		}

		const createNoteResult = await this.plugin.fileHelper.createMediaDbNoteFromModel(idSearchResult, { attachTemplate: true, openNote: true });
		if (!createNoteResult.ok) {
			this.reportMdbError(createNoteResult.error);
		}
	}

	async queryDetails(models: MediaTypeModel[]): Promise<MediaTypeModel[]> {
		const results = await Promise.all(models.map(model => this.plugin.apiManager.queryDetailedInfo(model)));

		const detailModels: MediaTypeModel[] = [];
		for (const result of results) {
			if (result.ok && result.value) {
				detailModels.push(result.value);
			} else if (!result.ok) {
				this.reportMdbError(result.error);
			}
		}

		return detailModels;
	}

	private async handleSeasonWorkflow(types: MediaType[], selectResults: MediaTypeModel[]): Promise<{ handled: boolean; seasonsCreated?: boolean }> {
		if (!types.includes(MediaType.Series) || !types.includes(MediaType.Season)) {
			return { handled: false };
		}

		const seriesResults = selectResults.filter(result => result.getMediaType() === MediaType.Series);
		if (seriesResults.length !== 1) {
			return { handled: false };
		}

		const seriesResult = seriesResults[0];
		const sourceApi = this.plugin.apiManager.getApiByName(seriesResult.dataSource);
		const seasonApiName = sourceApi?.getSeasonApiNameForSeries(seriesResult);
		if (seasonApiName) {
			const created = await this.showSeasonSelectAndCreate(seriesResult.id, seriesResult.title, undefined, seasonApiName);
			return { handled: true, seasonsCreated: created };
		}

		return { handled: false };
	}

	private isSeasonSearchResult(model: MediaTypeModel): model is SeasonSearchResultModel {
		return model instanceof SeasonSearchResultModel || (model.getMediaType() === MediaType.Season && typeof (model as { seasonCount?: unknown }).seasonCount === 'number');
	}

	async handleSeasonSearchSelections(selectedResults: MediaTypeModel[], attachFile?: TFile): Promise<{ handled: boolean; created: boolean }> {
		const seasonSearchResults = selectedResults.filter(result => this.isSeasonSearchResult(result));
		if (seasonSearchResults.length === 0) {
			return { handled: false, created: false };
		}

		if (selectedResults.length !== 1) {
			new Notice('Select exactly one season search result before choosing seasons.');
			return { handled: true, created: false };
		}

		const selectedResult = seasonSearchResults[0];
		return {
			handled: true,
			created: await this.showSeasonSelectAndCreate(selectedResult.id, selectedResult.englishTitle || selectedResult.title, attachFile, selectedResult.dataSource),
		};
	}

	private getSeasonListApi(apiName: string): SeasonListAPIModel | undefined {
		const api = this.plugin.apiManager.getApiByName(apiName);
		return isSeasonListAPIModel(api) ? api : undefined;
	}

	private async showSeasonSelectAndCreate(seriesId: string, seriesTitle: string, attachFile: TFile | undefined, seasonApiName: string): Promise<boolean> {
		const seasonAPI = this.getSeasonListApi(seasonApiName);
		if (!seasonAPI) {
			new Notice(`${seasonApiName} does not support season selection.`);
			return false;
		}

		const allSeasonsResult = await seasonAPI.getSeasonsForSeries(seriesId);
		if (!allSeasonsResult.ok) {
			this.reportMdbError(allSeasonsResult.error);
			new Notice(`Error loading seasons: ${allSeasonsResult.error.userMessage}`);
			return false;
		}

		const allSeasons = allSeasonsResult.value;
		if (allSeasons.length === 0) {
			new Notice('No seasons found for this series.');
			return false;
		}

		const selectedSeasons = await this.showSeasonSelectModal(allSeasons, seriesTitle);
		if (!selectedSeasons || selectedSeasons.length === 0) {
			return false;
		}

		const createdCount = await this.createNotesForSelectedSeasons(selectedSeasons, allSeasons, seasonAPI, attachFile);
		if (createdCount === 0) {
			new Notice('No season entries were created.');
			return false;
		}

		new Notice(`Successfully created ${createdCount} season ${createdCount === 1 ? 'entry' : 'entries'}.`);
		return true;
	}

	private async showSeasonSelectModal(allSeasons: SeasonModel[], seriesTitle: string): Promise<SeasonSelectModalElement[] | undefined> {
		return await this.plugin.modalHelper.promptSeasonSelectModal({
			seasons: allSeasons.map(season => ({
				season_number: season.seasonNumber,
				name: season.seasonTitle || season.title,
				episode_count: season.episodes || 0,
				air_date: season.year,
				poster_path: season.image,
			})),
			multiSelect: true,
			seriesName: seriesTitle,
		});
	}

	private async createNotesForSelectedSeasons(
		selectedSeasons: SeasonSelectModalElement[],
		allSeasons: SeasonModel[],
		seasonAPI: SeasonListAPIModel,
		attachFile?: TFile,
	): Promise<number> {
		const results = await Promise.all(
			selectedSeasons.map(async selectedSeason => {
				const seasonModel = allSeasons.find(season => season.seasonNumber === selectedSeason.season_number);
				if (seasonModel) {
					const fullMetadataResult = await seasonAPI.getById(seasonModel.id);
					if (!fullMetadataResult.ok) {
						this.reportMdbError(fullMetadataResult.error);
						new Notice(`Failed to load season ${selectedSeason.season_number}: ${fullMetadataResult.error.userMessage}`);
						return false;
					}

					const createResult = await this.plugin.fileHelper.createMediaDbNotes([fullMetadataResult.value], attachFile);
					if (!createResult.ok) {
						this.reportMdbError(createResult.error);
						return false;
					}

					return true;
				}

				return false;
			}),
		);

		return results.filter(created => created).length;
	}
}
