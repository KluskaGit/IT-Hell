import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@angular/core';

import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../features/auth/auth.service';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;

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
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose auth signals from AuthService', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set('Jan');
    fixture.detectChanges();

    expect(component.isAuthenticated()).toBe(true);
    expect(component.username()).toBe('Jan');
  });

  it('should render login button when user is not authenticated', () => {
    authServiceMock.isAuthenticated.set(false);
    authServiceMock.username.set(null);
    fixture.detectChanges();

    const loginButton = fixture.debugElement.query(By.css('.btn-login'));
    const logoutButton = fixture.debugElement.query(By.css('.btn-logout'));
    const userBadge = fixture.debugElement.query(By.css('.user-badge'));

    expect(loginButton).toBeTruthy();
    expect(loginButton.nativeElement.textContent).toContain('Zaloguj się');
    expect(logoutButton).toBeNull();
    expect(userBadge).toBeNull();
  });

  it('should render user badge and logout button when user is authenticated', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set('Jan');
    fixture.detectChanges();

    const loginButton = fixture.debugElement.query(By.css('.btn-login'));
    const logoutButton = fixture.debugElement.query(By.css('.btn-logout'));
    const userBadge = fixture.debugElement.query(By.css('.user-badge'));

    expect(loginButton).toBeNull();
    expect(logoutButton).toBeTruthy();
    expect(logoutButton.nativeElement.textContent).toContain('Wyloguj się');
    expect(userBadge).toBeTruthy();
    expect(userBadge.nativeElement.textContent).toContain('Jan');
  });

  it('should render uppercase first letter of username in avatar', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set('jan');
    fixture.detectChanges();

    const avatar = fixture.debugElement.query(By.css('.user-avatar'));

    expect(avatar).toBeTruthy();
    expect(avatar.nativeElement.textContent.trim()).toBe('J');
  });

  it('should render fallback user label and avatar when username is missing', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set(null);
    fixture.detectChanges();

    const userBadge = fixture.debugElement.query(By.css('.user-badge'));
    const avatar = fixture.debugElement.query(By.css('.user-avatar'));

    expect(userBadge).toBeTruthy();
    expect(userBadge.nativeElement.textContent).toContain('Użytkownik');
    expect(avatar.nativeElement.textContent.trim()).toBe('U');
  });

  it('should call AuthService.login when login button is clicked', async () => {
    authServiceMock.isAuthenticated.set(false);
    fixture.detectChanges();

    const loginButton = fixture.debugElement.query(By.css('.btn-login'));

    await loginButton.nativeElement.click();

    expect(authServiceMock.login).toHaveBeenCalledTimes(1);
  });

  it('should call AuthService.logout when logout button is clicked', async () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.username.set('Jan');
    fixture.detectChanges();

    const logoutButton = fixture.debugElement.query(By.css('.btn-logout'));

    await logoutButton.nativeElement.click();

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
  });

  it('should render navigation links', () => {
    const links = fixture.debugElement.queryAll(By.css('.nav-links a'));

    expect(links.length).toBe(2);
    expect(links[0].nativeElement.textContent).toContain('Strona główna');
    expect(links[1].nativeElement.textContent).toContain('Oferty pracy');
  });

  it('should render logo link to home page', () => {
    const logo = fixture.debugElement.query(By.css('.logo'));

    expect(logo).toBeTruthy();
    expect(logo.nativeElement.textContent).toContain('CV');
    expect(logo.nativeElement.textContent).toContain('_ANALIZER');
  });
});