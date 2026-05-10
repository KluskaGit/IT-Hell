import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationItem } from '../location-picker/location-picker.component';

@Component({
  selector: 'app-tech-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tp-root">

      <div class="tp-field" [class.tp-focused]="showDropdown" (click)="onFieldClick()">
        <svg class="tp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
        </svg>

        <div class="tp-tags">
          <span class="tp-tag" *ngFor="let item of selected">
            {{ item.name }}
            <button type="button" class="tp-tag-x" (click)="$event.stopPropagation(); remove(item.id)">×</button>
          </span>
          <input
            #inputEl
            class="tp-input"
            type="text"
            [placeholder]="selected.length === 0 ? 'Kliknij lub wpisz technologię…' : 'Dodaj kolejną…'"
            [(ngModel)]="query"
            (input)="onInput()"
            (focus)="onFocus()"
            (blur)="onBlur()"
            autocomplete="off">
        </div>

        <button *ngIf="selected.length > 0" type="button" class="tp-clear" (click)="$event.stopPropagation(); clearAll()" title="Wyczyść">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <svg class="tp-chevron" [class.tp-chevron--open]="showDropdown"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="tp-dropdown" *ngIf="showDropdown">
        <div class="tp-dropdown-header" *ngIf="!query.trim()">
          <span>Wszystkie technologie</span>
          <span class="tp-count">{{ availableCount }}</span>
        </div>
        <div class="tp-dropdown-header" *ngIf="query.trim()">
          <span>Wyniki dla „{{ query.trim() }}"</span>
          <span class="tp-count">{{ filtered.length }}</span>
        </div>

        <div class="tp-no-results" *ngIf="technologies.length === 0">Ładowanie…</div>
        <div class="tp-no-results" *ngIf="technologies.length > 0 && filtered.length === 0">
          Brak wyników dla „{{ query }}"
        </div>
        <button
          *ngFor="let item of filtered"
          type="button"
          class="tp-option"
          (mousedown)="select(item)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="tp-option-icon">
            <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span [innerHTML]="highlight(item.name)"></span>
        </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    .tp-root { position: relative; }

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
    .tp-field.tp-focused {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      outline: none;
    }

    .tp-icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      color: #94a3b8;
      transition: color 0.2s;
    }
    .tp-field.tp-focused .tp-icon { color: #6366f1; }

    .tp-chevron {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: #94a3b8;
      transition: transform 0.2s, color 0.2s;
    }
    .tp-chevron--open { transform: rotate(180deg); color: #6366f1; }

    .tp-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      flex: 1;
      min-width: 0;
    }

    .tp-tag {
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
    .tp-tag-x {
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
    .tp-tag-x:hover { color: #ef4444; }

    .tp-input {
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.9rem;
      color: #1e293b;
      padding: 2px 0;
      flex: 1;
      min-width: 100px;
    }
    .tp-input::placeholder { color: #94a3b8; }

    .tp-clear {
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
    .tp-clear:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }

    .tp-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      z-index: 300;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06);
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      scrollbar-width: thin;
      scrollbar-color: #e2e8f0 transparent;
    }
    .tp-dropdown::-webkit-scrollbar { width: 5px; }
    .tp-dropdown::-webkit-scrollbar-track { background: transparent; }
    .tp-dropdown::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

    .tp-dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px 4px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 2px;
    }

    .tp-count {
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 99px;
    }

    .tp-no-results {
      padding: 10px 14px;
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .tp-option {
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
    .tp-option:hover {
      background: #eef2ff;
      color: #4f46e5;
    }
    .tp-option:hover .tp-option-icon { color: #6366f1; }

    .tp-option-icon { color: #cbd5e1; flex-shrink: 0; transition: color 0.1s; }

    .tp-option :global(strong) { color: #4f46e5; font-weight: 700; }
  `]
})
export class TechPickerComponent {
  @Input() technologies: LocationItem[] = [];
  @Input() selected: LocationItem[] = [];
  @Output() selectedChange = new EventEmitter<LocationItem[]>();

  query = '';
  showDropdown = false;

  get availableCount(): number {
    return this.technologies.filter(t => !this.selected.some(s => s.id === t.id)).length;
  }

  get filtered(): LocationItem[] {
    const q = this.query.trim().toLowerCase();
    const unselected = this.technologies.filter(t => !this.selected.some(s => s.id === t.id));
    if (!q) return unselected;
    return unselected.filter(t => t.name.toLowerCase().includes(q));
  }

  highlight(name: string): string {
    const q = this.query.trim();
    if (!q) return name;
    const idx = name.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return name;
    return (
      name.slice(0, idx) +
      `<strong style="color:#4f46e5;font-weight:700">${name.slice(idx, idx + q.length)}</strong>` +
      name.slice(idx + q.length)
    );
  }

  onFieldClick(): void { this.showDropdown = true; }
  onInput(): void { this.showDropdown = true; }
  onFocus(): void { this.showDropdown = true; }
  onBlur(): void { setTimeout(() => { this.showDropdown = false; }, 160); }

  select(item: LocationItem): void {
    this.selected = [...this.selected, item];
    this.selectedChange.emit(this.selected);
    this.query = '';
    this.showDropdown = true;
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
