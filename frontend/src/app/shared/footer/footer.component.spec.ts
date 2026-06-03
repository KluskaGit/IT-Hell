import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterLink } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render footer brand', () => {
    const brand = fixture.debugElement.query(By.css('.footer-brand'));

    expect(brand).toBeTruthy();
    expect(brand.nativeElement.textContent).toContain('CV');
    expect(brand.nativeElement.textContent).toContain('_ANALIZER');
  });

  it('should render copyright text', () => {
    const copy = fixture.debugElement.query(By.css('.footer-copy'));

    expect(copy).toBeTruthy();
    expect(copy.nativeElement.textContent).toContain('2026');
    expect(copy.nativeElement.textContent).toContain('IT-Hell');
    expect(copy.nativeElement.textContent).toContain('CV_ANALIZER');
  });

  it('should render three footer links with correct labels', () => {
    const links = fixture.debugElement.queryAll(By.css('.footer-links a'));

    expect(links).toHaveLength(3);
    expect(links[0].nativeElement.textContent).toContain('O nas');
    expect(links[1].nativeElement.textContent).toContain('Jak to działa');
    expect(links[2].nativeElement.textContent).toContain('Regulamin & Prywatność');
  });

  it('should link to /about for the first link', () => {
    const linkDebugEls = fixture.debugElement.queryAll(By.directive(RouterLink));
    const aboutLink = linkDebugEls[0].injector.get(RouterLink);

    expect(aboutLink.href).toContain('/about');
  });

  it('should link to /legal with tab=how for the second link', () => {
    const linkDebugEls = fixture.debugElement.queryAll(By.directive(RouterLink));
    const legalHowLink = linkDebugEls[1].injector.get(RouterLink);

    expect(legalHowLink.href).toContain('/legal');
    expect(legalHowLink.queryParams).toEqual({ tab: 'how' });
  });

  it('should link to /legal with tab=terms for the third link', () => {
    const linkDebugEls = fixture.debugElement.queryAll(By.directive(RouterLink));
    const legalTermsLink = linkDebugEls[2].injector.get(RouterLink);

    expect(legalTermsLink.href).toContain('/legal');
    expect(legalTermsLink.queryParams).toEqual({ tab: 'terms' });
  });

  it('should render footer logo icon', () => {
    const icon = fixture.debugElement.query(By.css('.footer-logo-icon'));

    expect(icon).toBeTruthy();
  });
});