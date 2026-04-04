import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';
import {
	INFERRED_RELEASE_GROUP_SECONDARY_TYPES,
	MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES,
	MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES,
} from '../api/musicBrainzReleaseGroupTypes';
import type MediaDbPlugin from '../main';

export class ReleaseTypesModal extends Modal {
	constructor(
		app: App,
		private readonly plugin: MediaDbPlugin,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle('Release types');

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		for (const t of MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES) {
			new Setting(contentEl)
				.setName(t.label)
				.addToggle(cb => {
					cb.setValue(this.plugin.settings.enabledReleaseGroupPrimaryTypes[t.id]).onChange(async on => {
						this.plugin.settings.enabledReleaseGroupPrimaryTypes[t.id] = on;
						await this.plugin.saveSettings();
					});
				});
		}

		for (const t of MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES) {
			new Setting(contentEl)
				.setName(t.label)
				.addToggle(cb => {
					cb.setValue(this.plugin.settings.enabledReleaseGroupSecondaryTypes[t.id]).onChange(async on => {
						this.plugin.settings.enabledReleaseGroupSecondaryTypes[t.id] = on;
						await this.plugin.saveSettings();
					});
				});
		}

		for (const t of INFERRED_RELEASE_GROUP_SECONDARY_TYPES) {
			new Setting(contentEl)
				.setName(`${t.label} (title contains "${t.titleIncludes}")`)
				.addToggle(cb => {
					cb.setValue(this.plugin.settings.enabledReleaseGroupSecondaryTypes[t.id]).onChange(async on => {
						this.plugin.settings.enabledReleaseGroupSecondaryTypes[t.id] = on;
						await this.plugin.saveSettings();
					});
				});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
