import { Component, OnInit } from '@angular/core';
import { Order } from '../services/order.service';
import { OrderService } from '../services/order.service';
import { DatabaseService } from '../services/database.service';
import { NavController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';

// Define a more specific interface for order items
interface VinylItem {
  id: number;
  titulo: string;
  artista: string;
  imagen: string;
  descripcion: any;
  tracklist: any;
  stock: number;
  precio: number;
  IsAvailable: boolean;
}

interface OrderItem {
  vinyl: VinylItem;
  quantity: number;
}

@Component({
  selector: 'app-orders-history',
  templateUrl: './orders-history.page.html',
  styleUrls: ['./orders-history.page.scss'],
})
export class OrdersHistoryPage implements OnInit {
  orders: Array<Order & { 
    items: OrderItem[]; 
    formattedCreatedAt: string 
  }> = [];
  loading = true;

  constructor(
    private orderService: OrderService,
    private databaseService: DatabaseService,
    private navCtrl: NavController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    const currentUser = this.databaseService.getCurrentUser();
    
    if (!currentUser) {
      this.navCtrl.navigateRoot('/login');
      return;
    }
  
    console.log('Current User ID:', currentUser.id);
    
    if (!currentUser.id) {
      await this.presentToast('No se pudo obtener el ID de usuario', 'danger');
      return;
    }
  
    this.loadOrders(currentUser.id);
  }
  
  loadOrders(userId: number) {
    this.loading = true;
  
    this.orderService.getOrdersByUserId(userId).subscribe({
      next: (orders) => {
        this.orders = orders.map(order => ({
          ...order,
          items: this.safeParseItems(order.items),
          formattedCreatedAt: order.createdAt 
            ? new Date(order.createdAt).toLocaleString('es-CL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Fecha no disponible'
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar órdenes:', err);
        this.orders = [];
        this.loading = false;
      }
    });
  }
  
  private safeParseItems(items: any): OrderItem[] {
    try {
      if (typeof items === 'string') {
        const parsedItems = JSON.parse(items || '[]');
        // Asegurarnos de que la estructura coincida con CartVinyl
        return Array.isArray(parsedItems) ? parsedItems : [];
      }
      if (Array.isArray(items)) return items;
      return [];
    } catch (error) {
      console.error('Error parsing items:', error);
      return [];
    }
  }

  getOrderTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + (item.vinyl.precio * item.quantity), 0);
  }

  formatPrice(price: number): string {
    return price.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  getPaymentMethodLabel(method: string): string {
    const methods: { [key: string]: string } = {
      'debito': 'Tarjeta de Débito',
      'credito': 'Tarjeta de Crédito',
      'efectivo': 'Efectivo'
    };
    return methods[method] || method;
  }

  ionViewWillEnter() {
    const currentUser = this.databaseService.getCurrentUser();
    if (currentUser?.id) {
      this.loadOrders(currentUser.id);
    } else {
      this.navCtrl.navigateRoot('/login');
    }
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger' = 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}