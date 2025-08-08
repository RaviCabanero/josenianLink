import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreedomWallPage } from './freedom-wall.page';

describe('FreedomWallPage', () => {
  let component: FreedomWallPage;
  let fixture: ComponentFixture<FreedomWallPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FreedomWallPage],
    });
    fixture = TestBed.createComponent(FreedomWallPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
