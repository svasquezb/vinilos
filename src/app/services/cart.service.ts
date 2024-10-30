import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Vinyl as BaseVinyl } from '../models/vinilos.model';  // Importa la interfaz base


export interface CartVinyl extends BaseVinyl {
  quantity: number;  // Hacemos quantity requerido para los items del carrito
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart: CartVinyl[] = [];
  private cartSubject = new BehaviorSubject<CartVinyl[]>([]);

  constructor() { }

  getCart() {
    return this.cartSubject.asObservable();
  }

  addToCart(vinyl: BaseVinyl) {
    const existingVinyl = this.cart.find(item => item.id === vinyl.id);
    if (existingVinyl) {
      existingVinyl.quantity += 1;
    } else {
      const cartItem: CartVinyl = { ...vinyl, quantity: 1 };
      this.cart.push(cartItem);
    }
    this.cartSubject.next(this.cart);
  }

  removeFromCart(vinylId: number) {
    this.cart = this.cart.filter(item => item.id !== vinylId);
    this.cartSubject.next(this.cart);
  }

  clearCart() {
    this.cart = [];
    this.cartSubject.next(this.cart);
  }

  getTotal() {
    return this.cart.reduce((total, item) => total + (item.precio * item.quantity), 0);
  }

  getCartItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }
}