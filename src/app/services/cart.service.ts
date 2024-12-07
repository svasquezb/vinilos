import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { take, switchMap, map, catchError } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { ToastController, NavController } from '@ionic/angular';

export interface CartVinyl {
  vinyl: {
    id: number;
    titulo: string;
    artista: string;
    imagen: string;
    descripcion: any;
    tracklist: any;
    stock: number;
    precio: number;
    IsAvailable: boolean;
  };
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
    // Escuchar cambios en la sesión del usuario
    this.databaseService.getActiveSession().subscribe(user => {
      if (user) {
        // Si hay un nuevo usuario activo
        if (this.currentUserId !== user.id) {
          this.currentUserId = user.id;
          this.isAuthenticated = true;
          // Cargar el carrito específico del usuario
          this.loadUserCart();
        }
      } else {
        // Si no hay usuario activo, limpiar el carrito
        this.currentUserId = null;
        this.isAuthenticated = false;
        this.cart = [];
        this.cartSubject.next([]);
      }
    });
  }

  private loadUserCart() {
    if (!this.currentUserId) return;

    this.databaseService.getCartFromDatabase(this.currentUserId)
      .pipe(take(1))
      .subscribe({
        next: (cartItems) => {
          // Actualizar el carrito con los items del usuario actual
          this.cart = cartItems;
          this.cartSubject.next(this.cart);
        },
        error: (error) => {
          console.error('Error al cargar el carrito:', error);
          this.cart = [];
          this.cartSubject.next([]);
        }
      });
  }

  getCart(): Observable<CartVinyl[]> {
    return this.cartSubject.asObservable();
  }

  async addToCart(vinyl: any): Promise<boolean> {
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
      const existingItemIndex = this.cart.findIndex(item => item.vinyl.id === vinyl.id);
      
      if (existingItemIndex !== -1) {
        if (this.cart[existingItemIndex].quantity >= vinyl.stock) {
          const toast = await this.toastController.create({
            message: 'Stock insuficiente',
            duration: 2000,
            position: 'bottom',
            color: 'warning'
          });
          await toast.present();
          return false;
        }
        this.cart[existingItemIndex].quantity += 1;
      } else {
        this.cart.push({ 
          vinyl: vinyl, 
          quantity: 1 
        });
      }

      // Guardar el carrito actualizado en la base de datos
      await this.saveCart().toPromise();
      this.cartSubject.next([...this.cart]); // Emitir una nueva copia del carrito
      
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

  saveCart(): Observable<boolean> {
    if (!this.currentUserId) return of(false);
    return this.databaseService.saveCartToDatabase(this.currentUserId, this.cart);
  }

  async removeFromCart(vinylId: number) {
    if (!this.currentUserId) return;
    
    this.cart = this.cart.filter(item => item.vinyl.id !== vinylId);
    
    // Guardar el carrito actualizado en la base de datos
    await this.saveCart().toPromise();
    
    this.cartSubject.next([...this.cart]); // Emitir una nueva copia del carrito
  }

  async clearCart() {
    if (!this.currentUserId) return;
    
    this.cart = [];
    
    // Guardar el carrito vacío en la base de datos
    await this.saveCart().toPromise();
    
    this.cartSubject.next([]); // Emitir carrito vacío
  }

  getTotal(): number {
    return this.cart.reduce((total, item) => total + (item.vinyl.precio * item.quantity), 0);
  }

  getCartItemCount(): number {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  // Método para sincronizar el carrito cuando el usuario inicia sesión
  syncCartWithUser(userId: number): Observable<boolean> {
    return this.databaseService.getCartFromDatabase(userId).pipe(
      switchMap(cartItems => {
        this.cart = cartItems;
        this.cartSubject.next(this.cart);
        return this.saveCart();
      }),
      catchError(error => {
        console.error('Error syncing cart:', error);
        return of(false);
      })
    );
  }
}