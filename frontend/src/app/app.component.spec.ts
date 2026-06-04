import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';

import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app component', () => {
    expect(component).toBeTruthy();
  });

  it('should render router-outlet', () => {
    const routerOutlet = fixture.debugElement.query(By.directive(RouterOutlet));

    expect(routerOutlet).toBeTruthy();
  });

  it('should have router-outlet as the only root rendered element in template', () => {
    const hostElement = fixture.nativeElement as HTMLElement;

    expect(hostElement.innerHTML).toContain('router-outlet');
    expect(hostElement.children.length).toBe(1);
    expect(hostElement.firstElementChild?.tagName.toLowerCase()).toBe('router-outlet');
  });
});