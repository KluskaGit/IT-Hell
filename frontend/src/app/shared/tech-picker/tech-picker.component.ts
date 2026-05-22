import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationItem } from '../location-picker/location-picker.component';
import { highlightMatch } from '../highlight';

@Component({
  selector: 'app-tech-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tp-wrap" (keydown.escape)="close()">

      <!-- Field -->
      <div class="tp-field" [class.tp-open]="showDropdown" (click)="toggle()">
        <svg class="tp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>

        <div class="tp-tags">
          <span class="tp-tag" *ngFor="let item of selected">
            {{ item.name }}
            <button type="button" class="tp-tag-rm"
                    (click)="$event.stopPropagation(); remove(item.id)" title="Usuń">×</button>
          </span>
          <input
            #inputEl
            class="tp-input"
            type="text"
            [placeholder]="selected.length === 0 ? 'Wpisz lub wybierz technologię…' : 'Dodaj kolejną…'"
            [(ngModel)]="query"
            (input)="openDropdown()"
            (focus)="openDropdown()"
            (click)="$event.stopPropagation()"
            autocomplete="off" />
        </div>

        <span class="tp-badge" *ngIf="selected.length > 0">{{ selected.length }}</span>

        <button *ngIf="selected.length > 0" type="button" class="tp-clear"
                (click)="$event.stopPropagation(); clearAll()" title="Wyczyść">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <svg class="tp-chevron" [class.tp-chevron-open]="showDropdown"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      <!-- Dropdown -->
      <div class="tp-dropdown"
           [class.tp-dropdown-up]="openUpward"
           [style.max-height.px]="dropdownMaxHeight"
           *ngIf="showDropdown">

        <div class="tp-dd-header">
          <span *ngIf="!query.trim()">Wszystkie technologie</span>
          <span *ngIf="query.trim()">Wyniki dla „{{ query.trim() }}"</span>
          <span class="tp-dd-count">{{ filtered.length }}</span>
        </div>

        <div class="tp-dd-empty" *ngIf="technologies.length === 0">Ładowanie…</div>
        <div class="tp-dd-empty" *ngIf="technologies.length > 0 && filtered.length === 0">
          Brak wyników dla „{{ query }}"
        </div>

        <button *ngFor="let item of filtered" type="button" class="tp-option"
                (click)="select(item)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" class="tp-opt-icon">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          <span [innerHTML]="highlight(item.name)"></span>
        </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .tp-wrap { position: relative; }

    /* ── Field — identyczny styl jak location-picker ─ */
    .tp-field {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0.6rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
      cursor: text;
      transition: border-color 0.2s, box-shadow 0.2s;
      min-height: 44px;
    }
    .tp-field.tp-open {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      outline: none;
    }

    .tp-field-icon {
      width: 15px; height: 15px; flex-shrink: 0;
      color: #94a3b8; transition: color 0.2s;
    }
    .tp-field.tp-open .tp-field-icon { color: #6366f1; }

    .tp-chevron {
      width: 14px; height: 14px; flex-shrink: 0;
      color: #94a3b8; transition: transform 0.2s, color 0.2s;
    }
    .tp-chevron-open { transform: rotate(180deg); color: #6366f1; }

    /* Tags */
    .tp-tags {
      display: flex; flex-wrap: wrap;
      align-items: center; gap: 5px;
      flex: 1; min-width: 0;
    }

    .tp-tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px 3px 10px;
      border: 1px solid #6366f1;
      border-radius: 50px;
      background: #eef2ff;
      color: #4f46e5;
      font-size: 0.78rem; font-weight: 600;
      white-space: nowrap;
    }

    .tp-tag-rm {
      background: none; border: none; padding: 0; margin-left: 1px;
      color: #818cf8; cursor: pointer;
      font-size: 1rem; line-height: 1;
      transition: color 0.15s;
    }
    .tp-tag-rm:hover { color: #ef4444; }

    .tp-input {
      border: none; outline: none; background: transparent;
      font-size: 0.9rem; color: #1e293b;
      padding: 2px 0; flex: 1; min-width: 100px; cursor: text;
    }
    .tp-input::placeholder { color: #94a3b8; }

    /* Badge licznika */
    .tp-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 6px;
      background: #6366f1; color: #fff;
      font-size: 0.7rem; font-weight: 800;
      border-radius: 99px; flex-shrink: 0;
    }

    /* Przycisk wyczyść */
    .tp-clear {
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; padding: 0; flex-shrink: 0;
      background: #f1f5f9; border: 1px solid #e2e8f0;
      border-radius: 50%; color: #94a3b8;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    .tp-clear:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }

    /* ── Dropdown ──────────────────────────────── */
    .tp-dropdown {
      position: absolute;
      left: 0; right: 0; z-index: 9999;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow:
        0 4px 6px -2px rgba(0, 0, 0, 0.05),
        0 12px 30px -4px rgba(0, 0, 0, 0.12);
      overflow-y: auto;
      padding: 4px;
      scrollbar-width: thin;
      scrollbar-color: #e2e8f0 transparent;
    }
    .tp-dropdown::-webkit-scrollbar { width: 4px; }
    .tp-dropdown::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

    .tp-dropdown:not(.tp-dropdown-up) {
      top: calc(100% + 6px);
      animation: tp-fade-down 0.14s ease-out;
    }
    .tp-dropdown-up {
      bottom: calc(100% + 6px);
      animation: tp-fade-up 0.14s ease-out;
    }

    @keyframes tp-fade-down {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes tp-fade-up {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Nagłówek dropdownu */
    .tp-dd-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px 5px;
      font-size: 0.7rem; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid #f1f5f9; margin-bottom: 2px;
    }
    .tp-dd-count {
      background: #f1f5f9; color: #64748b;
      font-size: 0.69rem; font-weight: 700;
      padding: 1px 7px; border-radius: 99px;
    }

    .tp-dd-empty {
      padding: 10px 12px;
      font-size: 0.83rem; color: #94a3b8; text-align: center;
    }

    /* Opcje */
    .tp-option {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 10px;
      background: transparent; border: none; border-radius: 8px;
      font-size: 0.875rem; color: #334155;
      cursor: pointer; text-align: left;
      transition: background 0.1s, color 0.1s;
    }
    .tp-option:hover { background: #eef2ff; color: #4f46e5; }
    .tp-option:hover .tp-opt-icon { color: #6366f1; }
    .tp-opt-icon { color: #cbd5e1; flex-shrink: 0; transition: color 0.1s; }
  `],
})
export class TechPickerComponent {
  private readonly host = inject(ElementRef);

  @Input() technologies: LocationItem[] = [];
  @Input() selected: LocationItem[] = [];
  @Output() selectedChange = new EventEmitter<LocationItem[]>();

  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;

  query = '';
  showDropdown = false;
  openUpward = false;
  dropdownMaxHeight = 260;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.showDropdown) this.close();
  }

  get filtered(): LocationItem[] {
    const q = this.query.trim().toLowerCase();
    const unselected = this.technologies.filter(t => !this.selected.some(s => s.id === t.id));
    if (!q) return unselected;
    return unselected.filter(t => t.name.toLowerCase().includes(q));
  }

  highlight(name: string): string {
    return highlightMatch(name, this.query, '#4338ca');
  }

  toggle(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.positionDropdown();
      setTimeout(() => this.inputEl?.nativeElement.focus(), 0);
    } else {
      this.query = '';
    }
  }

  openDropdown(): void {
    if (!this.showDropdown) this.positionDropdown();
    this.showDropdown = true;
  }

  close(): void {
    this.showDropdown = false;
    this.query = '';
  }

  select(item: LocationItem): void {
    this.selected = [...this.selected, item];
    this.selectedChange.emit(this.selected);
    this.query = '';
    setTimeout(() => this.inputEl?.nativeElement.focus(), 0);
  }

  remove(id: string): void {
    this.selected = this.selected.filter(s => s.id !== id);
    this.selectedChange.emit(this.selected);
  }

  clearAll(): void {
    this.selected = [];
    this.selectedChange.emit(this.selected);
  }

  private positionDropdown(): void {
    this.openUpward = false;
    const el = this.host.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    let card: HTMLElement | null = el.parentElement;
    while (card && !card.classList.contains('ff-card')) {
      card = card.parentElement;
    }
    const cardBottom = card?.getBoundingClientRect().bottom ?? Infinity;
    const available = cardBottom - rect.bottom - 16;
    this.dropdownMaxHeight = Math.min(160, Math.max(100, available));
  }
}
