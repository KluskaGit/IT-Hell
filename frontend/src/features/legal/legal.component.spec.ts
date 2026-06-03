import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router, RouterLink } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { LegalComponent } from './legal.component';
import { AuthService } from '../auth/auth.service';

describe('LegalComponent', () => {
  let fixture: ComponentFixture<LegalComponent>;
  let component: LegalComponent;
  let router: Router;

  const authServiceMock = {
    isAuthenticated: signal(false),
    username: signal<string | null>(null),
    login: vi.fn(),
    logout: vi.fn(),
  };

  function createActivatedRouteMock(tab: string | null) {
    return {
      snapshot: {
        queryParamMap: convertToParamMap(tab ? { tab } : {}),
      },
    };
  }

  async function configure(tab: string | null = null) {
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.logout.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [LegalComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createActivatedRouteMock(tab) },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegalComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  }

  it('should create', async () => {
    await configure();
    expect(component).toBeTruthy();
  });

  it('should default to "how" tab when query param is missing', async () => {
    await configure(null);

    expect(component.activeTab).toBe('how');

    const hero = fixture.debugElement.query(By.css('.hero-block'));
    const legalCard = fixture.debugElement.query(By.css('.legal-card'));

    expect(hero).toBeTruthy();
    expect(legalCard).toBeNull();
  });

  it('should activate "how" tab from query param', async () => {
    await configure('how');

    expect(component.activeTab).toBe('how');

    const buttons = fixture.debugElement.queryAll(By.css('.legal-tabs button'));
    expect(buttons[0].nativeElement.classList.contains('active')).toBe(true);
    expect(buttons[1].nativeElement.classList.contains('active')).toBe(false);
  });

  it('should activate "terms" tab from query param', async () => {
    await configure('terms');

    expect(component.activeTab).toBe('terms');

    const hero = fixture.debugElement.query(By.css('.hero-block'));
    const legalCard = fixture.debugElement.query(By.css('.legal-card'));
    const buttons = fixture.debugElement.queryAll(By.css('.legal-tabs button'));

    expect(hero).toBeNull();
    expect(legalCard).toBeTruthy();
    expect(buttons[0].nativeElement.classList.contains('active')).toBe(false);
    expect(buttons[1].nativeElement.classList.contains('active')).toBe(true);
  });

  it('should ignore unsupported tab value and keep default "how"', async () => {
    await configure('unknown');

    expect(component.activeTab).toBe('how');
  });

  it('should call router.navigate with replaceUrl when setTab is used', async () => {
    await configure();

    component.setTab('terms');

    expect(component.activeTab).toBe('terms');
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { tab: 'terms' },
      replaceUrl: true,
    });
  });

  it('should render all steps in "how" tab', async () => {
    await configure('how');

    const steps = fixture.debugElement.queryAll(By.css('.step-card'));

    expect(steps).toHaveLength(4);
    expect(steps[0].nativeElement.textContent).toContain('Ustaw filtry preferencji');
    expect(steps[1].nativeElement.textContent).toContain('Wgraj CV');
    expect(steps[2].nativeElement.textContent).toContain('Przeglądaj oferty');
    expect(steps[3].nativeElement.textContent).toContain('Otwórz ofertę u źródła');
  });

  it('should render all feature cards in "how" tab', async () => {
    await configure('how');

    const features = fixture.debugElement.queryAll(By.css('.feature-card'));

    expect(features).toHaveLength(6);
    expect(features[0].nativeElement.textContent).toContain('Filtry w czasie rzeczywistym');
    expect(features[1].nativeElement.textContent).toContain('Skaner CV');
  });

  it('should render technology badges in "how" tab', async () => {
    await configure('how');

    const techBadges = fixture.debugElement.queryAll(By.css('.tech-badge'));

    expect(techBadges).toHaveLength(7);
    expect(techBadges[0].nativeElement.textContent).toContain('Angular 21');
    expect(techBadges[1].nativeElement.textContent).toContain('FastAPI');
    expect(techBadges[4].nativeElement.textContent).toContain('Keycloak');
  });

    it('should toggle faq items', async () => {
    authServiceMock.isAuthenticated.set(false);
    authServiceMock.username.set(null);
    await configure('how');

    const questions = fixture.debugElement.queryAll(By.css('.faq-question'));
    expect(questions.length).toBeGreaterThan(1);
    expect(component.expandedFaq).toBeNull();

    questions[1].nativeElement.click();
    fixture.detectChanges();

    expect(component.expandedFaq).toBe(1);
    let answers = fixture.debugElement.queryAll(By.css('.faq-answer'));
    expect(answers).toHaveLength(1);

    questions[1].nativeElement.click();
    fixture.detectChanges();

    expect(component.expandedFaq).toBeNull();
    answers = fixture.debugElement.queryAll(By.css('.faq-answer'));
    expect(answers).toHaveLength(0);
    });

  it('should render guest CTA when user is not authenticated', async () => {
    authServiceMock.isAuthenticated.set(false);
    await configure('how');

    const guestCta = fixture.debugElement.query(By.css('.cta-guest'));
    const loggedCta = fixture.debugElement.query(By.css('.cta-logged'));

    expect(guestCta).toBeTruthy();
    expect(loggedCta).toBeNull();
    expect(guestCta.nativeElement.textContent).toContain('Gotowy żeby zacząć?');
  });

    it('should render logged CTA when user is authenticated', async () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set('Jan');
    await configure('how');
    fixture.detectChanges();

    const guestCta = fixture.debugElement.query(By.css('.cta-guest'));
    const loggedCta = fixture.debugElement.query(By.css('.cta-logged'));

    expect(loggedCta).toBeTruthy();
    expect(guestCta).toBeNull();
    expect(loggedCta.nativeElement.textContent).toContain('Witaj z powrotem!');
    });

  it('should render legal and privacy content in "terms" tab', async () => {
    await configure('terms');

    const legalCard = fixture.debugElement.query(By.css('.legal-card'));

    expect(legalCard).toBeTruthy();
    expect(legalCard.nativeElement.textContent).toContain('Regulamin Serwisu CV_ANALIZER');
    expect(legalCard.nativeElement.textContent).toContain('Polityka Prywatności');
    expect(legalCard.nativeElement.textContent).toContain('RODO');
  });

  it('should render navbar and footer', async () => {
    await configure('how');

    const navbar = fixture.debugElement.query(By.css('app-navbar'));
    const footer = fixture.debugElement.query(By.css('app-footer'));

    expect(navbar).toBeTruthy();
    expect(footer).toBeTruthy();
  });

    it('should configure CTA router links correctly in logged mode', async () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set('Jan');
    await configure('how');
    fixture.detectChanges();

    const ctaLinks = fixture.debugElement.queryAll(By.css('.cta-logged a'));

    expect(ctaLinks).toHaveLength(2);

    const profileLink = ctaLinks[0].injector.get(RouterLink);
    const offersLink = ctaLinks[1].injector.get(RouterLink);

    expect(profileLink.href).toContain('/profile');
    expect(offersLink.href).toContain('/offers');
    });

  it('should configure CTA router links correctly in logged mode', async () => {
    authServiceMock.isAuthenticated.set(true);
    await configure('how');

    const ctaLinks = fixture.debugElement.queryAll(By.css('.cta-logged a'));

    expect(ctaLinks).toHaveLength(2);

    const profileLink = ctaLinks[0].injector.get(RouterLink);
    const offersLink = ctaLinks[1].injector.get(RouterLink);

    expect(profileLink.href).toContain('/profile');
    expect(offersLink.href).toContain('/offers');
  });
});