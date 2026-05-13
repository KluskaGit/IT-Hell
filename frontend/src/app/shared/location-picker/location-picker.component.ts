import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

    /* ── Field ── */
    .lp-field {
      display: flex; align-items: center; gap: 7px;
      padding: 0.48rem 0.75rem;
      border: 1.5px solid #dde4f0;
      border-radius: 11px;
      background: rgba(255,255,255,.82);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: text;
      transition: border-color .2s, box-shadow .2s, background .2s;
      min-height: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .lp-field.lp-focused {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,.14), 0 1px 4px rgba(0,0,0,.04);
      background: rgba(255,255,255,.97);
    }

    .lp-pin {
      width: 14px; height: 14px; flex-shrink: 0;
      color: #94a3b8; transition: color .2s;
    }
    .lp-field.lp-focused .lp-pin { color: #6366f1; }

    .lp-tags {
      display: flex; flex-wrap: wrap; align-items: center;
      gap: 4px; flex: 1; min-width: 0;
    }

    /* ── Tags ── */
    .lp-tag {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 6px 2px 9px;
      border: 1px solid #c7d2fe; border-radius: 999px;
      background: #eef2ff; color: #4338ca;
      font-size: 0.74rem; font-weight: 700;
      white-space: nowrap; letter-spacing: .01em;
    }
    .lp-tag-x {
      background: none; border: none; padding: 0; margin-left: 1px;
      color: #a5b4fc; cursor: pointer;
      font-size: 0.95rem; line-height: 1; transition: color .15s;
    }
    .lp-tag-x:hover { color: #ef4444; }

    /* ── Input ── */
    .lp-input {
      border: none; outline: none; background: transparent;
      font-size: 0.82rem; color: #1e293b; font-family: inherit;
      padding: 2px 0; flex: 1; min-width: 120px;
    }
    .lp-input::placeholder { color: #94a3b8; }

    /* ── Clear ── */
    .lp-clear {
      display: flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; padding: 0; flex-shrink: 0;
      background: rgba(241,245,249,.8); border: 1px solid #e2e8f0;
      border-radius: 50%; color: #94a3b8;
      cursor: pointer; transition: all .15s;
    }
    .lp-clear:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }

    /* ── Dropdown ── */
    .lp-dropdown {
      position: absolute;
      top: calc(100% + 5px); left: 0; right: 0; z-index: 300;
      background: rgba(255,255,255,.97);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(226,232,240,.9);
      border-radius: 13px;
      box-shadow: 0 4px 6px -2px rgba(15,23,42,.05), 0 12px 32px -4px rgba(15,23,42,.12);
      overflow: hidden; padding: 5px;
      animation: lp-fade .15s ease-out;
    }

    @keyframes lp-fade {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .lp-no-results {
      padding: 10px 13px; font-size: 0.8rem;
      color: #94a3b8; text-align: center;
    }

    /* ── Options ── */
    .lp-option {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 7px 11px;
      background: transparent; border: none; border-radius: 9px;
      font-size: 0.82rem; font-weight: 500; color: #334155;
      cursor: pointer; text-align: left; font-family: inherit;
      transition: background .12s, color .12s;
    }
    .lp-option:hover {
      background: linear-gradient(90deg, #eef2ff 0%, rgba(238,242,255,.3) 100%);
      color: #4338ca;
    }
    .lp-option:hover .lp-option-pin { color: #6366f1; }
    .lp-option-pin { color: #c7d2fe; flex-shrink: 0; transition: color .12s; }
    .lp-option :global(strong) { color: #4338ca; font-weight: 800; }
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
