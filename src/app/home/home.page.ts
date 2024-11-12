import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../services/cart.service';
import { ToastController } from '@ionic/angular';
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
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.startBannerRotation();
    this.cargarVinilosDestacados();
  }

  async cargarVinilosDestacados() {
    this.loading = true;
  
    this.databaseService.executeQuerySQL(
      `SELECT * FROM Vinyls ORDER BY id DESC LIMIT 3`
    ).subscribe(
      (result) => {
        if (result && result.values) {
          this.vinilosDestacados = result.values.map(item => ({
            id: item.id,
            titulo: item.titulo,
            artista: item.artista,
            imagen: item.imagen,
            descripcion: JSON.parse(item.descripcion),
            tracklist: JSON.parse(item.tracklist),
            stock: item.stock,
            precio: item.precio,
            IsAvailable: item.IsAvailable === 1
          }));
          console.log('Vinilos destacados cargados:', this.vinilosDestacados);
        }
      },
      (error) => {
        console.error('Error cargando vinilos:', error);
        this.presentToast('Error al cargar los vinilos', 'danger');
      },
      () => {
        this.loading = false;
      }
    );
  }

  ionViewWillEnter() {
    if (this.vinilosDestacados.length === 0) {
      this.loading = true;
      this.cargarVinilosDestacados();
    }
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
    if (this.viniloSeleccionado) {
      try {
        this.cartService.addToCart(this.viniloSeleccionado);
        await this.presentToast(`${this.viniloSeleccionado.titulo} agregado al carrito`);
        this.cerrarDescripcion();
      } catch (error) {
        console.error('Error al agregar al carrito:', error);
        await this.presentToast('Error al agregar al carrito', 'danger');
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
    await toast.present();
  }
}