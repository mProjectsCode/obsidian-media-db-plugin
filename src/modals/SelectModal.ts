import {App, Modal, Setting} from 'obsidian';
import {SelectModalElement} from './SelectModalElement';

export abstract class SelectModal<T> extends Modal {
	multiSelect: boolean;
	allowMultiSelect: boolean;

	title: string;
	description: string;

	elements: T[];
	selectModalElements: SelectModalElement<T>[];


	constructor(app: App, elements: T[]) {
		super(app);
		this.elements = elements;
		this.allowMultiSelect = true;

		this.selectModalElements = [];
	}

	abstract renderElement(value: T, el: HTMLElement): any;

	abstract submit(): void;

	disableAllOtherElements(elementId: number) {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.id !== elementId) {
				selectModalElement.setActive(false);
			}
		}
	}

	async onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: this.title});
		contentEl.createEl('p', {text: this.description});

		if (this.allowMultiSelect) {
			new Setting(contentEl)
				.setName('Select Multiple')
				.addToggle(cb => {
					cb.setValue(this.multiSelect);
					cb.onChange(value => {
						this.multiSelect = value;
						for (const selectModalElement of this.selectModalElements) {
							selectModalElement.setActive(false);
						}
					});
				});
		}

		const elementWrapper = contentEl.createDiv({cls: 'media-db-plugin-select-wrapper'});

		let i = 0;
		for (const element of this.elements) {
			const selectModalElement = new SelectModalElement(element, contentEl, i, this, false);

			this.selectModalElements.push(selectModalElement);

			this.renderElement(element, selectModalElement.element);

			i += 1;
		}

		new Setting(contentEl)
			.addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()))
			.addButton(btn => btn.setButtonText('Ok').setCta().onClick(() => this.submit()));
	}
}
