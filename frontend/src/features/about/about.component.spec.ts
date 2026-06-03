import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AboutComponent } from './about.component';
import { AuthService } from '../auth/auth.service';

describe('AboutComponent', () => {
  let fixture: ComponentFixture<AboutComponent>;
  let component: AboutComponent;

  const authServiceMock = {
    isAuthenticated: signal(false),
    username: signal<string | null>(null),
    login: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    authServiceMock.isAuthenticated.set(false);
    authServiceMock.username.set(null);
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.logout.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render navbar and footer', () => {
    const navbar = fixture.debugElement.query(By.css('app-navbar'));
    const footer = fixture.debugElement.query(By.css('app-footer'));

    expect(navbar).toBeTruthy();
    expect(footer).toBeTruthy();
  });

  it('should render hero section with project heading', () => {
    const badge = fixture.debugElement.query(By.css('.badge'));
    const heading = fixture.debugElement.query(By.css('.hero-section h1'));
    const sub = fixture.debugElement.query(By.css('.hero-sub'));

    expect(badge.nativeElement.textContent).toContain('O projekcie');
    expect(heading.nativeElement.textContent).toContain('Zespół');
    expect(heading.nativeElement.textContent).toContain('IT-Hell');
    expect(sub.nativeElement.textContent).toContain('Budujemy narzędzie');
  });

  it('should render team section labels', () => {
    const labels = fixture.debugElement.queryAll(By.css('.team-group-label'));

    expect(labels).toHaveLength(2);
    expect(labels[0].nativeElement.textContent).toContain('Frontend');
    expect(labels[1].nativeElement.textContent).toContain('Backend');
  });

  it('should render four team members', () => {
    const members = fixture.debugElement.queryAll(By.css('.team-card'));

    expect(members).toHaveLength(4);
    expect(members[0].nativeElement.textContent).toContain('Marek K.');
    expect(members[1].nativeElement.textContent).toContain('Piotrek B.');
    expect(members[2].nativeElement.textContent).toContain('Kamil K.');
    expect(members[3].nativeElement.textContent).toContain('Marek G.');
  });

  it('should render five navigation cards with correct labels', () => {
    const navCards = fixture.debugElement.queryAll(By.css('.nav-card'));

    expect(navCards).toHaveLength(5);
    expect(navCards[0].nativeElement.textContent).toContain('Strona główna');
    expect(navCards[1].nativeElement.textContent).toContain('Oferty pracy');
    expect(navCards[2].nativeElement.textContent).toContain('Jak to działa');
    expect(navCards[3].nativeElement.textContent).toContain('Regulamin');
    expect(navCards[4].nativeElement.textContent).toContain('Polityka Prywatności');
  });

    it('should configure router links correctly for about nav cards only', () => {
    const navCardLinks = fixture.debugElement.queryAll(By.css('.nav-card'));

    expect(navCardLinks).toHaveLength(5);

    const homeLink = navCardLinks[0].injector.get(RouterLink);
    const offersLink = navCardLinks[1].injector.get(RouterLink);
    const howLink = navCardLinks[2].injector.get(RouterLink);
    const termsLink = navCardLinks[3].injector.get(RouterLink);
    const privacyLink = navCardLinks[4].injector.get(RouterLink);

    expect(homeLink.href).toContain('/');
    expect(offersLink.href).toContain('/offers');

    expect(howLink.href).toContain('/legal');
    expect(howLink.queryParams).toEqual({ tab: 'how' });

    expect(termsLink.href).toContain('/legal');
    expect(termsLink.queryParams).toEqual({ tab: 'terms' });

    expect(privacyLink.href).toContain('/legal');
    expect(privacyLink.queryParams).toEqual({ tab: 'terms' });
    });

  it('should render section labels', () => {
    const labels = fixture.debugElement.queryAll(By.css('.section-label'));

    expect(labels).toHaveLength(2);
    expect(labels[0].nativeElement.textContent).toContain('Zespół');
    expect(labels[1].nativeElement.textContent).toContain('Eksploruj serwis');
  });
});