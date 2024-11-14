import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../services/cart.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';
import { Vinyl } from '../models/vinilos.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  vinilosDestacados: Vinyl[] = [];
  viniloSeleccionado: Vinyl | null = null;
  mostrarDescripcionDetalle: 'descripcion' | 'tracklist' = 'descripcion';
  loading: boolean = true;

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
    private databaseService: DatabaseService,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.startBannerRotation();
    this.cargarVinilosDestacados();
  }

  async cargarVinilosDestacados() {
    const loading = await this.loadingController.create({
      message: 'Cargando vinilos destacados...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      console.log('Iniciando carga de vinilos destacados');
      const vinilosFromDB = await firstValueFrom(this.databaseService.getVinyls());
      
      if (!vinilosFromDB || vinilosFromDB.length === 0) {
        console.log('No se encontraron vinilos');
        await this.presentToast('No se encontraron vinilos disponibles', 'warning');
        return;
      }

      // Tomar solo los últimos 3 vinilos
      this.vinilosDestacados = vinilosFromDB.slice(-3);
      console.log('Vinilos destacados cargados:', this.vinilosDestacados);

    } catch (error) {
      console.error('Error al cargar vinilos destacados:', error);
      await this.presentToast('Error al cargar los vinilos', 'danger');
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  ionViewWillEnter() {
    this.cargarVinilosDestacados();
  }

  ngOnDestroy() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  startBannerRotation() {
    this.bannerInterval = setInterval(() => {
      this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
    }, 4000);
  }

  verDetalles(vinilo: Vinyl) {
    this.viniloSeleccionado = vinilo;
    this.mostrarDescripcionDetalle = 'descripcion';
  }

  cerrarDescripcion() {
    this.viniloSeleccionado = null;
  }

  async agregarAlCarrito() {
    if (this.viniloSeleccionado && this.viniloSeleccionado.id !== undefined) {
      try {
        await firstValueFrom(this.databaseService.updateVinylStock(
          this.viniloSeleccionado.id, 
          this.viniloSeleccionado.stock - 1
        ));
        
        this.cartService.addToCart(this.viniloSeleccionado);
        await this.presentToast(`${this.viniloSeleccionado.titulo} agregado al carrito`);
        await this.cargarVinilosDestacados();
        this.cerrarDescripcion();
      } catch (error) {
        console.error('Error al agregar al carrito:', error);
        await this.presentToast('Error al agregar al carrito', 'danger');
      }
    } else {
      await this.presentToast('No se puede agregar este vinilo al carrito', 'danger');
    }
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}