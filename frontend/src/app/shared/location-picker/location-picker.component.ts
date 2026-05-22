import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { highlightMatch } from '../highlight';

export interface LocationItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lp-root">

      <div class="lp-field" [class.lp-focused]="showDropdown">
        <svg class="lp-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>

        <div class="lp-tags">
          <span class="lp-tag" *ngFor="let loc of selected">
            {{ loc.name }}
            <button type="button" class="lp-tag-x" (click)="remove(loc.id)">×</button>
          </span>
          <input
            class="lp-input"
            type="text"
            [placeholder]="selected.length === 0 ? 'Wpisz miasto, np. Warszawa…' : 'Dodaj kolejne…'"
            [(ngModel)]="query"
            (input)="onInput()"
            (focus)="onFocus()"
            (blur)="onBlur()"
            autocomplete="off">
        </div>

        <button *ngIf="selected.length > 0" type="button" class="lp-clear" (click)="clearAll()" title="Wyczyść">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="lp-dropdown" *ngIf="showDropdown">
        <div class="lp-no-results" *ngIf="locations.length === 0">Ładowanie…</div>
        <div class="lp-no-results" *ngIf="locations.length > 0 && filtered.length === 0">
          Brak wyników dla „{{ query }}"
        </div>
        <button
          *ngFor="let loc of filtered"
          type="button"
          class="lp-option"
          (mousedown)="select(loc)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="lp-option-pin">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span [innerHTML]="highlight(loc.name)"></span>
        </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .lp-root { position: relative; }

    /* ── pole ── */
    .lp-field {
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
    .lp-field.lp-focused {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      outline: none;
    }

    .lp-pin {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      color: #94a3b8;
      transition: color 0.2s;
    }
    .lp-field.lp-focused .lp-pin { color: #6366f1; }

    .lp-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      flex: 1;
      min-width: 0;
    }

    /* chipsy — styl jak .pill-card:checked */
    .lp-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px 3px 10px;
      border: 1px solid #6366f1;
      border-radius: 50px;
      background: #eef2ff;
      color: #4f46e5;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .lp-tag-x {
      background: none;
      border: none;
      padding: 0;
      margin-left: 1px;
      color: #818cf8;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      transition: color 0.15s;
    }
    .lp-tag-x:hover { color: #ef4444; }

    /* input w polu */
    .lp-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.9rem;
      color: #1e293b;
      padding: 2px 0;
      flex: 1;
      min-width: 140px;
    }
    .lp-input::placeholder { color: #94a3b8; }

    /* przycisk wyczyść */
    .lp-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      flex-shrink: 0;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 50%;
      color: #94a3b8;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .lp-clear:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }

    /* ── dropdown ── */
    .lp-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      z-index: 300;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      padding: 4px;
    }

    .lp-no-results {
      padding: 10px 14px;
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .lp-option {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #334155;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s, color 0.1s;
    }
    .lp-option:hover {
      background: #eef2ff;
      color: #4f46e5;
    }
    .lp-option:hover .lp-option-pin { color: #6366f1; }

    .lp-option-pin { color: #cbd5e1; flex-shrink: 0; transition: color 0.1s; }

    /* podświetlenie dopasowania */
    .lp-option :global(strong) { color: #4f46e5; font-weight: 700; }
  `]
})
export class LocationPickerComponent {
  @Input() locations: LocationItem[] = [];
  @Input() selected: LocationItem[] = [];
  @Output() selectedChange = new EventEmitter<LocationItem[]>();

  query = '';
  showDropdown = false;

  get filtered(): LocationItem[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return [];
    return this.locations
      .filter(l => l.name.toLowerCase().includes(q) && !this.selected.some(s => s.id === l.id))
      .slice(0, 8);
  }

  highlight(name: string): string {
    return highlightMatch(name, this.query, '#4f46e5');
  }

  onInput(): void { this.showDropdown = this.query.trim().length > 0; }
  onFocus(): void { if (this.query.trim()) this.showDropdown = true; }
  onBlur(): void { setTimeout(() => { this.showDropdown = false; }, 160); }

  select(loc: LocationItem): void {
    this.selected = [...this.selected, loc];
    this.selectedChange.emit(this.selected);
    this.query = '';
    this.showDropdown = false;
  }

  remove(id: string): void {
    this.selected = this.selected.filter(s => s.id !== id);
    this.selectedChange.emit(this.selected);
  }

  clearAll(): void {
    this.selected = [];
    this.selectedChange.emit(this.selected);
  }
}
