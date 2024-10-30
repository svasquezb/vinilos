import { Component, OnInit } from '@angular/core';
import { CartService, CartVinyl } from '../services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
})
export class CartPage implements OnInit {
  cart: (CartVinyl & { id: number })[] = [];
  total = 0;

  constructor(private cartService: CartService) { }

  ngOnInit() {
    this.cartService.getCart().subscribe((cart) => {
      this.cart = cart.filter(item => item.id !== undefined) as (CartVinyl & { id: number })[];
      this.total = this.cartService.getTotal();
    });
  }

  getFormattedTotal() {
    return this.total.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  removeItem(vinylId: number | undefined) {
    if (vinylId !== undefined) {
      this.cartService.removeFromCart(vinylId);
    } else {
      console.error('Attempted to remove item with undefined id');
      // Opcionalmente, puedes mostrar un mensaje al usuario
    }
  }

  clearCart() {
    this.cartService.clearCart();
  }
}