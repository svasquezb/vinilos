import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Vinyl as BaseVinyl } from '../models/vinilos.model';
import { DatabaseService } from './database.service';
import { ToastController, NavController } from '@ionic/angular';

export interface CartVinyl extends BaseVinyl {
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private currentUserId: number | null = null;
  private cart: CartVinyl[] = [];
  private cartSubject = new BehaviorSubject<CartVinyl[]>([]);
  private isAuthenticated = false;

  constructor(
    private databaseService: DatabaseService,
    private toastController: ToastController,
    private navCtrl: NavController
  ) {
    this.databaseService.getActiveSession().subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.isAuthenticated = true;
        this.loadUserCart();
      } else {
        this.currentUserId = null;
        this.isAuthenticated = false;
        this.clearCart();
      }
    });
  }

  private async loadUserCart() {
    if (!this.currentUserId) return;
    try {
      const cartItems = await this.databaseService.getCartFromDatabase(this.currentUserId).toPromise();
      this.cart = cartItems || [];
      this.cartSubject.next(this.cart);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }

  private async saveCart() {
    if (!this.currentUserId) return;
    try {
      await this.databaseService.saveCartToDatabase(this.currentUserId, this.cart).toPromise();
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  getCart(): Observable<CartVinyl[]> {
    return this.cartSubject.asObservable();
  }

  async addToCart(vinyl: BaseVinyl): Promise<boolean> {
    if (!this.isAuthenticated) {
      const toast = await this.toastController.create({
        message: 'Debe iniciar sesión para agregar productos al carrito',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return false;
    }
  
    // Verificar stock disponible
    if (vinyl.stock <= 0) {
      const toast = await this.toastController.create({
        message: 'Producto sin stock disponible',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return false;
    }
  
    try {
      const existingVinyl = this.cart.find(item => item.id === vinyl.id);
      
      // Verificar que la cantidad en carrito no exceda el stock
      if (existingVinyl) {
        if (existingVinyl.quantity >= vinyl.stock) {
          const toast = await this.toastController.create({
            message: 'Stock insuficiente',
            duration: 2000,
            position: 'bottom',
            color: 'warning'
          });
          await toast.present();
          return false;
        }
        existingVinyl.quantity += 1;
      } else {
        const cartItem: CartVinyl = { ...vinyl, quantity: 1 };
        this.cart.push(cartItem);
      }
  
      this.cartSubject.next(this.cart);
      await this.saveCart();
      
      const toast = await this.toastController.create({
        message: 'Producto agregado al carrito',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      const toast = await this.toastController.create({
        message: 'Error al agregar al carrito',
        duration: 2000, 
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      return false;
    }
  }

  private async navigateToLogin() {
    try {
      await this.navCtrl.navigateForward('/login', {
        animated: true,
        animationDirection: 'forward'
      });
    } catch (error) {
      console.error('Error navigating to login:', error);
    }
  }

  async removeFromCart(vinylId: number) {
    if (!this.currentUserId) return;
    this.cart = this.cart.filter(item => item.id !== vinylId);
    this.cartSubject.next(this.cart);
    await this.saveCart();
  }

  async clearCart() {
    this.cart = [];
    this.cartSubject.next(this.cart);
    if (this.currentUserId) {
      await this.saveCart();
    }
  }

  getTotal(): number {
    return this.cart.reduce((total, item) => total + (item.precio * item.quantity), 0);
  }

  getCartItemCount(): number {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }
}