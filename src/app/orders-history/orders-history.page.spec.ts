import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersHistoryPage } from './orders-history.page';

describe('OrdersHistoryPage', () => {
  let component: OrdersHistoryPage;
  let fixture: ComponentFixture<OrdersHistoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OrdersHistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
