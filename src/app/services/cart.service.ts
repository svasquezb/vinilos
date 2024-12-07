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
    // Cargar el carrito guardado al iniciar el servicio
    this.loadSavedCart();

    // Escuchar cambios en la sesión del usuario
    this.databaseService.getActiveSession().subscribe(user => {
      if (user) {
        if (this.currentUserId !== user.id) {
          const previousUserId = this.currentUserId;
          this.currentUserId = user.id;
          this.isAuthenticated = true;
          
          // Si había un usuario anterior, guardar su carrito antes de cambiar
          if (previousUserId) {
            this.saveCartToLocalStorage(previousUserId, this.cart);
          }
          
          // Cargar el carrito del nuevo usuario
          this.loadUserCart();
        }
      } else {
        // Si se cierra sesión, guardar el carrito actual
        if (this.currentUserId) {
          this.saveCartToLocalStorage(this.currentUserId, this.cart);
        }
        this.currentUserId = null;
        this.isAuthenticated = false;
        this.cart = [];
        this.cartSubject.next([]);
      }
    });
  }

  private loadSavedCart() {
    const savedUserId = localStorage.getItem('lastUserId');
    if (savedUserId) {
      const savedCart = this.getCartFromLocalStorage(parseInt(savedUserId));
      if (savedCart) {
        this.cart = savedCart;
        this.cartSubject.next(this.cart);
      }
    }
  }

  private saveCartToLocalStorage(userId: number, cart: CartVinyl[]) {
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    localStorage.setItem('lastUserId', userId.toString());
  }

  private getCartFromLocalStorage(userId: number): CartVinyl[] | null {
    const savedCart = localStorage.getItem(`cart_${userId}`);
    return savedCart ? JSON.parse(savedCart) : null;
  }

  private loadUserCart() {
    if (!this.currentUserId) return;

    // Primero intentar cargar desde localStorage
    const savedCart = this.getCartFromLocalStorage(this.currentUserId);
    if (savedCart) {
      this.cart = savedCart;
      this.cartSubject.next(this.cart);
    }

    // Luego sincronizar con la base de datos
    this.databaseService.getCartFromDatabase(this.currentUserId)
      .pipe(take(1))
      .subscribe({
        next: (cartItems) => {
          // Combinar items del localStorage con los de la base de datos
          this.cart = this.mergeCartItems(savedCart || [], cartItems);
          this.cartSubject.next(this.cart);
          // Guardar el carrito combinado
          this.saveCart().subscribe();
        },
        error: (error) => {
          console.error('Error al cargar el carrito:', error);
          if (!savedCart) {
            this.cart = [];
            this.cartSubject.next([]);
          }
        }
      });
  }

  private mergeCartItems(localCart: CartVinyl[], dbCart: CartVinyl[]): CartVinyl[] {
    const mergedCart: CartVinyl[] = [...localCart];
    
    dbCart.forEach(dbItem => {
      const existingIndex = mergedCart.findIndex(item => item.vinyl.id === dbItem.vinyl.id);
      if (existingIndex === -1) {
        mergedCart.push(dbItem);
      } else {
        // Usar la cantidad más alta entre local y DB
        mergedCart[existingIndex].quantity = Math.max(
          mergedCart[existingIndex].quantity,
          dbItem.quantity
        );
      }
    });

    return mergedCart;
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

      // Guardar el carrito actualizado
      await this.saveCart().toPromise();
      this.cartSubject.next([...this.cart]);
      
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
    
    // Guardar tanto en localStorage como en la base de datos
    this.saveCartToLocalStorage(this.currentUserId, this.cart);
    return this.databaseService.saveCartToDatabase(this.currentUserId, this.cart);
  }

  async removeFromCart(vinylId: number) {
    if (!this.currentUserId) return;
    
    this.cart = this.cart.filter(item => item.vinyl.id !== vinylId);
    
    // Guardar el carrito actualizado
    await this.saveCart().toPromise();
    this.cartSubject.next([...this.cart]);
  }

  async clearCart() {
    if (!this.currentUserId) return;
    
    this.cart = [];
    
    // Guardar el carrito vacío
    await this.saveCart().toPromise();
    this.cartSubject.next([]);
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

  syncCartWithUser(userId: number): Observable<boolean> {
    return this.databaseService.getCartFromDatabase(userId).pipe(
      switchMap(cartItems => {
        const savedCart = this.getCartFromLocalStorage(userId);
        this.cart = this.mergeCartItems(savedCart || [], cartItems);
        this.cartSubject.next(this.cart);
        return this.saveCart();
      }),
      catchError(error => {
        console.error('Error syncing cart:', error);
        return of(false);
      })
    );
  }

  async updateCartItemQuantity(vinylId: number, newQuantity: number): Promise<boolean> {
    const itemIndex = this.cart.findIndex(item => item.vinyl.id === vinylId);
    if (itemIndex === -1) return false;

    const item = this.cart[itemIndex];
    if (newQuantity > item.vinyl.stock) {
      const toast = await this.toastController.create({
        message: 'Stock insuficiente',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return false;
    }

    if (newQuantity <= 0) {
      await this.removeFromCart(vinylId);
    } else {
      this.cart[itemIndex].quantity = newQuantity;
      await this.saveCart().toPromise();
      this.cartSubject.next([...this.cart]);
    }

    return true;
  }
}