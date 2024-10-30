import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VinilosPage } from './vinilos.page';

describe('VinilosPage', () => {
  let component: VinilosPage;
  let fixture: ComponentFixture<VinilosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VinilosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
