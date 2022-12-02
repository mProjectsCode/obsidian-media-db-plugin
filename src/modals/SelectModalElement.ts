import { SelectModal } from './SelectModal';

export class SelectModalElement<T> {
	selectModal: SelectModal<T>;
	value: T;
	readonly id: number;
	element: HTMLDivElement;
	cssClass: string;
	activeClass: string;
	hoverClass: string;
	private active: boolean;
	private highlighted: boolean;

	constructor(value: T, parentElement: HTMLElement, id: number, selectModal: SelectModal<T>, active: boolean = false) {
		this.value = value;
		this.id = id;
		this.active = active;
		this.selectModal = selectModal;

		this.cssClass = 'media-db-plugin-select-element';
		this.activeClass = 'media-db-plugin-select-element-selected';
		this.hoverClass = 'media-db-plugin-select-element-hover';

		this.element = parentElement.createDiv({ cls: this.cssClass });
		this.element.id = this.getHTMLId();
		this.element.on('click', '#' + this.getHTMLId(), () => {
			this.setActive(!this.active);
			if (!this.selectModal.allowMultiSelect) {
				this.selectModal.disableAllOtherElements(this.id);
			}
		});
		this.element.on('mouseenter', '#' + this.getHTMLId(), () => {
			this.setHighlighted(true);
		});
		this.element.on('mouseleave', '#' + this.getHTMLId(), () => {
			this.setHighlighted(false);
		});
	}

	getHTMLId(): string {
		return `media-db-plugin-select-element-${this.id}`;
	}

	isHighlighted(): boolean {
		return this.highlighted;
	}

	setHighlighted(value: boolean): void {
		this.highlighted = value;
		if (this.highlighted) {
			this.addClass(this.hoverClass);
			this.selectModal.deHighlightAllOtherElements(this.id);
		} else {
			this.removeClass(this.hoverClass);
		}
	}

	isActive(): boolean {
		return this.active;
	}

	setActive(active: boolean): void {
		this.active = active;
		this.update();
	}

	update(): void {
		if (this.active) {
			this.addClass(this.activeClass);
		} else {
			this.removeClass(this.activeClass);
		}
	}

	addClass(cssClass: string): void {
		if (!this.element.hasClass(cssClass)) {
			this.element.addClass(cssClass);
		}
	}

	removeClass(cssClass: string): void {
		if (this.element.hasClass(cssClass)) {
			this.element.removeClass(cssClass);
		}
	}
}
