import { Component, OnInit } from '@angular/core';
import { CartService, CartVinyl } from '../services/cart.service';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
})
export class CartPage implements OnInit {
  cart: CartVinyl[] = [];
  total = 0;

  constructor(
    private cartService: CartService,
    private navCtrl: NavController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.cartService.getCart().subscribe((cart) => {
      this.cart = cart;
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

  removeItem(vinylId: number) {
    this.cartService.removeFromCart(vinylId);
  }

  clearCart() {
    this.cartService.clearCart();
  }

  async procederAlPago() {
    if (this.cart.length > 0) {
      await this.navCtrl.navigateForward('/checkout');
    } else {
      const toast = await this.toastController.create({
        message: 'El carrito está vacío',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
    }
  }
}