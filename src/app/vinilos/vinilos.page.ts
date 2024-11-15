import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/cart.service';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { Vinyl } from '../models/vinilos.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-vinilos',
  templateUrl: './vinilos.page.html',
  styleUrls: ['./vinilos.page.scss'],
})
export class VinilosPage implements OnInit {
  vinilos: Vinyl[] = [];
  vinilosFiltrados: Vinyl[] = [];
  viniloSeleccionado: Vinyl | null = null;
  mostrarDescripcionDetalle: 'descripcion' | 'tracklist' = 'descripcion';
  loading = true;

  constructor(
    private cartService: CartService,
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}
  async ngOnInit() {
    await this.cargarVinilos();
  }

  async cargarVinilos() {
    const loading = await this.loadingController.create({
      message: 'Cargando vinilos...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      console.log('Iniciando carga de vinilos');
      const vinilosFromDB = await firstValueFrom(this.databaseService.getVinyls());
      
      console.log('Vinilos obtenidos:', vinilosFromDB);
      
      if (!vinilosFromDB || vinilosFromDB.length === 0) {
        console.log('No se encontraron vinilos');
        await this.presentToast('No se encontraron vinilos disponibles', 'warning');
        return;
      }

      this.vinilos = vinilosFromDB;
      this.vinilosFiltrados = this.vinilos;
      console.log(`Se cargaron ${this.vinilos.length} vinilos`);
      
    } catch (error) {
      console.error('Error al cargar vinilos:', error);
      await this.presentToast('Error al cargar los vinilos', 'danger');
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  buscarVinilos(event: any) {
    const textoBusqueda = event.target.value.toLowerCase();

    if (textoBusqueda && textoBusqueda.trim() !== '') {
      this.vinilosFiltrados = this.vinilos.filter(vinilo =>
        vinilo.titulo.toLowerCase().includes(textoBusqueda) ||
        vinilo.artista.toLowerCase().includes(textoBusqueda)
      );
    } else {
      this.vinilosFiltrados = this.vinilos;
    }
  }

  mostrarDescripcion(vinilo: Vinyl) {
    this.viniloSeleccionado = vinilo;
    this.mostrarDescripcionDetalle = 'descripcion';
  }

  getDescripcionTexto(vinilo: Vinyl | null): string {
    if (!vinilo) return '';
    return Array.isArray(vinilo.descripcion) ? vinilo.descripcion.join('<br>') : vinilo.descripcion;
  }

  cerrarDescripcion() {
    this.viniloSeleccionado = null;
  }

  async agregarAlCarrito() {
    if (this.viniloSeleccionado && this.viniloSeleccionado.id !== undefined) {
      try {
        await firstValueFrom(this.databaseService.updateVinylStock(this.viniloSeleccionado.id, this.viniloSeleccionado.stock - 1));
        
        const viniloParaCarrito: Vinyl & { id: number } = {
          ...this.viniloSeleccionado,
          id: this.viniloSeleccionado.id
        };
        
        this.cartService.addToCart(viniloParaCarrito);
        await this.presentToast(`${this.viniloSeleccionado.titulo} agregado al carrito`);
        
        await this.cargarVinilos();
        
        this.cerrarDescripcion();
      } catch (error) {
        console.error('Error al agregar al carrito:', error);
        await this.presentToast('Error al agregar al carrito. Por favor, intente de nuevo.', 'danger');
      }
    } else {
      await this.presentToast('No se puede agregar este vinilo al carrito.', 'danger');
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