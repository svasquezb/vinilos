import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/cart.service';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Vinyl } from '../models/vinilos.model';

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
    await this.esperarBaseDatos();
    await this.cargarVinilos();
  }

  private async esperarBaseDatos() {
    await firstValueFrom(this.databaseService.getDatabaseState().pipe(
      filter(ready => ready === true),
      take(1)
    ));
  }

  async cargarVinilos() {
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
        this.vinilos = [];
        this.vinilosFiltrados = [];
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
        const added = await this.cartService.addToCart(this.viniloSeleccionado);
        if (added) {
          await firstValueFrom(
            this.databaseService.updateVinylStock(
              this.viniloSeleccionado.id,
              this.viniloSeleccionado.stock - 1
            )
          );
          await this.cargarVinilos();
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