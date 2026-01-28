import type { App } from 'obsidian';
import type { SeasonSelectModalElement } from '../modals/MediaDbSeasonSelectModal';
import { MediaDbSeasonSelectModal } from '../modals/MediaDbSeasonSelectModal';

export async function openSeasonSelectModal(app: App, plugin: any, seasons: SeasonSelectModalElement[]): Promise<SeasonSelectModalElement[] | undefined> {
	return new Promise(resolve => {
		const modal = new MediaDbSeasonSelectModal(plugin, seasons, true);
		modal.setSubmitCallback(selected => {
			resolve(selected);
		});
		modal.setCloseCallback(() => {
			resolve(undefined);
		});
		modal.open();
	});
}
