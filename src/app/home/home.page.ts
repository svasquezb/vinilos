import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService, CartVinyl } from '../services/cart.service';
import { Vinyl } from '../models/vinilos.model';  
import { ToastController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  vinilosDestacados: Vinyl[] = [];
  viniloSeleccionado: Vinyl | null = null;
  mostrarDescripcionDetalle: 'descripcion' | 'tracklist' = 'descripcion';

  banners: string[] = [
    'assets/img/banner.jpg',
    'assets/img/banner2.jpg',
    'assets/img/banner3.png'
  ];

  currentBannerIndex = 0; 
  bannerInterval: any;

  constructor(
    private cartService: CartService,
    private toastController: ToastController,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {
    this.startBannerRotation();
    await this.cargarVinilosDestacados();
  }

  ngOnDestroy() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  async cargarVinilosDestacados() {
    try {
      // Cargar todos los vinilos
      const vinilos = await firstValueFrom(this.databaseService.getVinyls());
      
      this.vinilosDestacados = vinilos.slice(0, 5);

      console.log('Vinilos destacados cargados:', this.vinilosDestacados);
    } catch (error) {
      console.error('Error al cargar vinilos destacados:', error);
      await this.presentToast('Error al cargar los vinilos destacados', 'danger');
    }
  }

  startBannerRotation() {
    this.bannerInterval = setInterval(() => {
      this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
    }, 4000);
  }

  verDetalles(vinilo: Vinyl) {
    this.viniloSeleccionado = vinilo;
  }

  cerrarDescripcion() {
    this.viniloSeleccionado = null;
  }

  async agregarAlCarrito() {
    if (this.viniloSeleccionado) {
      if (this.viniloSeleccionado.stock > 0) {
        this.cartService.addToCart(this.viniloSeleccionado);
        await this.presentToast(`${this.viniloSeleccionado.titulo} agregado al carrito`);
        this.cerrarDescripcion();
        
        // Actualizar el stock en la base de datos
        await firstValueFrom(
          this.databaseService.updateVinylStock(
            this.viniloSeleccionado.id!, 
            this.viniloSeleccionado.stock - 1
          )
        );
        
        // Recargar los vinilos para actualizar la vista
        await this.cargarVinilosDestacados();
      } else {
        await this.presentToast('No hay stock disponible', 'warning');
      }
    }
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }
}