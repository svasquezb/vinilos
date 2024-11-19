import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../services/cart.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
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
  loading = true;

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

  async ngOnInit() {
    await this.esperarBaseDatos();
    this.startBannerRotation();
    await this.cargarVinilosDestacados();
  }

  private async esperarBaseDatos() {
    await firstValueFrom(this.databaseService.getDatabaseState().pipe(
      filter(ready => ready === true),
      take(1)
    ));
  }

  async cargarVinilosDestacados() {
    const loading = await this.loadingController.create({
      message: 'Cargando vinilos...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      const vinilosFromDB = await firstValueFrom(this.databaseService.getVinyls());
      
      if (!vinilosFromDB || vinilosFromDB.length === 0) {
        console.log('No se encontraron vinilos');
        await this.presentToast('No se encontraron vinilos disponibles', 'warning');
        this.vinilosDestacados = [];
        return;
      }

      this.vinilosDestacados = vinilosFromDB.slice(-3);
      console.log(`Se cargaron ${this.vinilosDestacados.length} vinilos destacados`);
      
    } catch (error) {
      console.error('Error al cargar vinilos:', error);
      await this.presentToast('Error al cargar los vinilos', 'danger');
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  startBannerRotation() {
    this.bannerInterval = setInterval(() => {
      this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
    }, 4000);
  }

  ngOnDestroy() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
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
        const added = await this.cartService.addToCart(this.viniloSeleccionado);
        if (added) {
          this.cerrarDescripcion();
        }
      } catch (error) {
        console.error('Error al agregar al carrito:', error);
      }
    }
   }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}