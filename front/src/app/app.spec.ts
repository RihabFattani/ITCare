import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { NotificationService } from './shared/notification';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display notifications', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(NotificationService).error('Accès refusé');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-danger')?.textContent).toContain('Accès refusé');
  });
});
