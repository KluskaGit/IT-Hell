import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationItem } from '../location-picker/location-picker.component';

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
          <span class="tp-tag" *ngFor="let item of visibleTags">
            {{ item.name }}
            <button type="button" class="tp-tag-rm"
                    (click)="$event.stopPropagation(); remove(item.id)" title="Usuń">×</button>
          </span>
          <!-- "+N więcej" badge -->
          <button *ngIf="hiddenTagCount > 0" type="button" class="tp-more-badge"
                  (click)="$event.stopPropagation(); showAllTags = true"
                  title="Pokaż wszystkie technologie">
            +{{ hiddenTagCount }}
          </button>
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

    /* ── Field ── */
    .tp-field {
      display: flex; align-items: center; gap: 7px;
      padding: 0.48rem 0.75rem;
      border: 1.5px solid #dde4f0; border-radius: 11px;
      background: rgba(255,255,255,.82);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      transition: border-color .2s, box-shadow .2s, background .2s;
      min-height: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
      user-select: none;
    }
    .tp-field.tp-open {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,.14), 0 1px 4px rgba(0,0,0,.04);
      background: rgba(255,255,255,.97);
    }

    .tp-field-icon {
      width: 14px; height: 14px; flex-shrink: 0;
      color: #94a3b8; transition: color .2s;
    }
    .tp-field.tp-open .tp-field-icon { color: #6366f1; }

    .tp-chevron {
      width: 13px; height: 13px; flex-shrink: 0;
      color: #94a3b8; transition: transform .22s, color .2s;
    }
    .tp-chevron-open { transform: rotate(180deg); color: #6366f1; }

    /* ── Tags ── */
    .tp-tags {
      display: flex; flex-wrap: wrap; align-items: center;
      gap: 4px; flex: 1; min-width: 0;
    }

    .tp-tag {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 6px 2px 9px;
      border: 1px solid #c7d2fe; border-radius: 999px;
      background: #eef2ff; color: #4338ca;
      font-size: 0.74rem; font-weight: 700;
      white-space: nowrap; letter-spacing: .01em;
    }
    .tp-tag-rm {
      background: none; border: none; padding: 0; margin-left: 1px;
      color: #a5b4fc; cursor: pointer;
      font-size: 0.95rem; line-height: 1; transition: color .15s;
    }
    .tp-tag-rm:hover { color: #ef4444; }

    .tp-more-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 2px 8px;
      border: 1.5px dashed #a5b4fc; border-radius: 999px;
      background: transparent; color: #6366f1;
      font-size: 0.7rem; font-weight: 700;
      cursor: pointer; white-space: nowrap;
      transition: background .15s, border-color .15s;
    }
    .tp-more-badge:hover { background: #eef2ff; border-color: #6366f1; }

    /* ── Input ── */
    .tp-input {
      border: none; outline: none; background: transparent;
      font-size: 0.82rem; color: #1e293b; font-family: inherit;
      padding: 2px 0; flex: 1; min-width: 80px; cursor: text;
    }
    .tp-input::placeholder { color: #94a3b8; }

    /* ── Badge licznika ── */
    .tp-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 19px; height: 19px; padding: 0 5px;
      background: linear-gradient(135deg, #818cf8, #6366f1); color: #fff;
      font-size: 0.68rem; font-weight: 800;
      border-radius: 99px; flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(99,102,241,.35);
    }

    /* ── Clear ── */
    .tp-clear {
      display: flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; padding: 0; flex-shrink: 0;
      background: rgba(241,245,249,.8); border: 1px solid #e2e8f0;
      border-radius: 50%; color: #94a3b8;
      cursor: pointer; transition: all .15s;
    }
    .tp-clear:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }

    /* ── Dropdown ── */
    .tp-dropdown {
      position: absolute; left: 0; right: 0; z-index: 9999;
      background: rgba(255,255,255,.97);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(226,232,240,.9); border-radius: 13px;
      box-shadow: 0 4px 6px -2px rgba(15,23,42,.05), 0 12px 32px -4px rgba(15,23,42,.12);
      overflow-y: auto; padding: 5px;
      scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent;
    }
    .tp-dropdown::-webkit-scrollbar { width: 4px; }
    .tp-dropdown::-webkit-scrollbar-thumb { background: #dde4f0; border-radius: 99px; }

    .tp-dropdown:not(.tp-dropdown-up) {
      top: calc(100% + 6px);
      animation: tp-fade-down .15s ease-out;
    }
    .tp-dropdown-up {
      bottom: calc(100% + 6px);
      animation: tp-fade-up .15s ease-out;
    }

    @keyframes tp-fade-down {
      from { opacity: 0; transform: translateY(-7px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes tp-fade-up {
      from { opacity: 0; transform: translateY(7px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Nagłówek ── */
    .tp-dd-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 11px 6px;
      font-size: 0.68rem; font-weight: 800; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .07em;
      border-bottom: 1px solid rgba(226,232,240,.7); margin-bottom: 3px;
    }
    .tp-dd-count {
      background: #f1f5f9; color: #64748b;
      font-size: 0.67rem; font-weight: 700;
      padding: 1px 7px; border-radius: 99px;
    }

    .tp-dd-empty {
      padding: 12px; font-size: 0.8rem;
      color: #94a3b8; text-align: center;
    }

    /* ── Opcje ── */
    .tp-option {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 7px 11px;
      background: transparent; border: none; border-radius: 9px;
      font-size: 0.82rem; font-weight: 500; color: #334155;
      cursor: pointer; text-align: left; font-family: inherit;
      transition: background .12s, color .12s;
    }
    .tp-option:hover {
      background: linear-gradient(90deg, #eef2ff 0%, rgba(238,242,255,.3) 100%);
      color: #4338ca;
    }
    .tp-option:hover .tp-opt-icon { color: #6366f1; }
    .tp-opt-icon { color: #c7d2fe; flex-shrink: 0; transition: color .12s; }
    .tp-option :global(strong) { color: #4338ca; font-weight: 800; }
  `],
})
export class TechPickerComponent {
  private readonly host = inject(ElementRef);

  @Input() technologies: LocationItem[] = [];
  @Input() selected: LocationItem[] = [];
  @Output() selectedChange = new EventEmitter<LocationItem[]>();

  /** Max tagów widocznych bez rozwinięcia. 999 = pokaż wszystkie. */
  @Input() maxVisibleTags = 999;

  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>;

  query = '';
  showDropdown = false;
  openUpward = false;
  dropdownMaxHeight = 260;
  showAllTags = false;

  get visibleTags(): LocationItem[] {
    if (this.showAllTags || this.selected.length <= this.maxVisibleTags) {
      return this.selected;
    }
    return this.selected.slice(0, this.maxVisibleTags);
  }

  get hiddenTagCount(): number {
    if (this.showAllTags || this.selected.length <= this.maxVisibleTags) return 0;
    return this.selected.length - this.maxVisibleTags;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.close();
    }
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
      `<strong style="color:#4338ca;font-weight:700">${name.slice(idx, idx + q.length)}</strong>` +
      name.slice(idx + q.length)
    );
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
    const cardBottom = card ? card.getBoundingClientRect().bottom : window.innerHeight;
    const available = cardBottom - rect.bottom - 16;
    this.dropdownMaxHeight = Math.min(160, Math.max(100, available));
  }
}
