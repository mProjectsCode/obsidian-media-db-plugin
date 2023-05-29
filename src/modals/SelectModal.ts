import { App, ButtonComponent, Modal, Setting } from 'obsidian';
import { SelectModalElement } from './SelectModalElement';
import { mod } from '../utils/Utils';

export abstract class SelectModal<T> extends Modal {
	allowMultiSelect: boolean;

	title: string;
	description: string;
	addSkipButton: boolean;
	cancelButton?: ButtonComponent;
	skipButton?: ButtonComponent;
	submitButton?: ButtonComponent;

	elementWrapper?: HTMLDivElement;

	elements: T[];
	selectModalElements: SelectModalElement<T>[];

	protected constructor(app: App, elements: T[], allowMultiSelect: boolean = true) {
		super(app);
		this.allowMultiSelect = allowMultiSelect;

		this.title = '';
		this.description = '';
		this.addSkipButton = false;
		this.cancelButton = undefined;
		this.skipButton = undefined;
		this.submitButton = undefined;

		this.elementWrapper = undefined;

		this.elements = elements;
		this.selectModalElements = [];

		this.scope.register([], 'ArrowUp', evt => {
			this.highlightUp();
			evt.preventDefault();
		});
		this.scope.register([], 'ArrowDown', evt => {
			this.highlightDown();
			evt.preventDefault();
		});
		this.scope.register([], 'ArrowRight', () => {
			this.activateHighlighted();
		});
		this.scope.register([], ' ', evt => {
			if (this.elementWrapper && this.elementWrapper === document.activeElement) {
				this.activateHighlighted();
				evt.preventDefault();
			}
		});
		this.scope.register([], 'Enter', () => this.submit());
	}

	abstract renderElement(value: T, el: HTMLElement): any;

	abstract submit(): void;

	abstract skip(): void;

	disableAllOtherElements(elementId: number): void {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.id !== elementId) {
				selectModalElement.setActive(false);
			}
		}
	}

	deHighlightAllOtherElements(elementId: number): void {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.id !== elementId) {
				selectModalElement.setHighlighted(false);
			}
		}
	}

	async onOpen(): Promise<void> {
		const { contentEl, titleEl } = this;

		titleEl.createEl('h2', { text: this.title });
		contentEl.addClass('media-db-plugin-select-modal');
		contentEl.createEl('p', { text: this.description });

		this.elementWrapper = contentEl.createDiv({ cls: 'media-db-plugin-select-wrapper' });
		this.elementWrapper.tabIndex = 0;

		let i = 0;
		for (const element of this.elements) {
			const selectModalElement = new SelectModalElement(element, this.elementWrapper, i, this, false);

			this.selectModalElements.push(selectModalElement);

			this.renderElement(element, selectModalElement.element);

			i += 1;
		}

		this.selectModalElements.first()?.element.scrollIntoView();

		const bottomSettingRow = new Setting(contentEl);
		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Cancel');
			btn.onClick(() => this.close());
			btn.buttonEl.addClass('media-db-plugin-button');
			this.cancelButton = btn;
		});
		if (this.addSkipButton) {
			bottomSettingRow.addButton(btn => {
				btn.setButtonText('Skip');
				btn.onClick(() => this.skip());
				btn.buttonEl.addClass('media-db-plugin-button');
				this.skipButton = btn;
			});
		}
		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Ok');
			btn.setCta();
			btn.onClick(() => this.submit());
			btn.buttonEl.addClass('media-db-plugin-button');
			this.submitButton = btn;
		});
	}

	activateHighlighted(): void {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.isHighlighted()) {
				selectModalElement.setActive(!selectModalElement.isActive());
				if (!this.allowMultiSelect) {
					this.disableAllOtherElements(selectModalElement.id);
				}
			}
		}
	}

	highlightUp(): void {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.isHighlighted()) {
				this.getPreviousSelectModalElement(selectModalElement).setHighlighted(true);
				return;
			}
		}

		// nothing is highlighted
		this.selectModalElements.last().setHighlighted(true);
	}

	highlightDown(): void {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.isHighlighted()) {
				this.getNextSelectModalElement(selectModalElement).setHighlighted(true);
				return;
			}
		}

		// nothing is highlighted
		this.selectModalElements.first().setHighlighted(true);
	}

	private getNextSelectModalElement(selectModalElement: SelectModalElement<T>): SelectModalElement<T> {
		let nextId = selectModalElement.id + 1;
		nextId = mod(nextId, this.selectModalElements.length);

		return this.selectModalElements.filter(x => x.id === nextId).first();
	}

	private getPreviousSelectModalElement(selectModalElement: SelectModalElement<T>): SelectModalElement<T> {
		let nextId = selectModalElement.id - 1;
		nextId = mod(nextId, this.selectModalElements.length);

		return this.selectModalElements.filter(x => x.id === nextId).first();
	}
}
