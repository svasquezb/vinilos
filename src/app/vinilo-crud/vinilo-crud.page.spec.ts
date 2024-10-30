import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViniloCrudPage } from './vinilo-crud.page';

describe('ViniloCrudPage', () => {
  let component: ViniloCrudPage;
  let fixture: ComponentFixture<ViniloCrudPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViniloCrudPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
