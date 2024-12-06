import { Component, OnInit } from '@angular/core';
import { Order } from '../services/order.service';
import { OrderService } from '../services/order.service';
import { DatabaseService } from '../services/database.service';
import { NavController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';

// Define a more specific interface for order items
interface OrderItem {
  id?: number;
  titulo: string;
  artista: string;
  precio: number;
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
            ? new Date(order.createdAt).toLocaleString('es-CL') 
            : 'Fecha no disponible' // Valor predeterminado en caso de que no haya fecha
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
      if (typeof items === 'string') return JSON.parse(items || '[]');
      if (Array.isArray(items)) return items;
      return [];
    } catch (error) {
      console.error('Error parsing items:', error);
      return [];
    }
  }

  formatPrice(price: number): string {
    return price.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  ionViewWillEnter() {
    const currentUser = this.databaseService.getCurrentUser();
    if (currentUser?.id) {
      this.loadOrders(currentUser.id); // Recargar órdenes
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