import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, AlertController, NavController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';
import { Vinyl } from '../models/vinilos.model';

@Component({
  selector: 'app-vinilo-crud',
  templateUrl: './vinilo-crud.page.html',
  styleUrls: ['./vinilo-crud.page.scss'],
})
export class ViniloCrudPage implements OnInit {
  vinilos: Vinyl[] = [];
  nuevoVinilo: Vinyl = this.inicializarNuevoVinilo();
  modoEdicion = false;
  viniloEditando: Vinyl | null = null;
  loading = true;

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {
    await this.cargarVinilos();
  }

  inicializarNuevoVinilo(): Vinyl {
    return {
      titulo: '',
      artista: '',
      imagen: '',
      descripcion: [''],
      tracklist: [''],
      stock: 0,
      precio: 0,
      IsAvailable: true
    };
  }

  getViniloActual(): Vinyl {
    return this.modoEdicion ? this.viniloEditando! : this.nuevoVinilo;
  }

  actualizarCampo(campo: keyof Vinyl, valor: any) {
    const vinilo = this.getViniloActual();
    
    if (campo === 'descripcion' || campo === 'tracklist') {
      if (typeof valor === 'string') {
        (vinilo[campo] as string[]) = valor.split('\n').filter(item => item.trim() !== '');
      } else if (Array.isArray(valor)) {
        (vinilo[campo] as string[]) = valor.filter(item => item.trim() !== '');
      }
    } else if (campo === 'stock' || campo === 'precio') {
      (vinilo[campo] as number) = Number(valor) || 0;
    } else {
      (vinilo[campo] as any) = valor;
    }
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
        this.vinilos = [];
        await this.presentToast('No se encontraron vinilos disponibles', 'warning');
        return;
      }

      this.vinilos = vinilosFromDB;
      console.log(`Se cargaron ${this.vinilos.length} vinilos`);
      
    } catch (error) {
      console.error('Error al cargar vinilos:', error);
      await this.presentToast('Error al cargar los vinilos', 'danger');
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  async crearVinilo() {
    if (!this.validarVinilo(this.nuevoVinilo)) {
      await this.presentToast('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creando vinilo...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      await firstValueFrom(this.databaseService.createVinyl(this.nuevoVinilo));
      await this.presentToast('Vinilo creado exitosamente', 'success');
      this.nuevoVinilo = this.inicializarNuevoVinilo();
      await this.cargarVinilos();
    } catch (error) {
      console.error('Error al crear vinilo:', error);
      await this.presentToast('Error al crear el vinilo', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  validarVinilo(vinilo: Vinyl): boolean {
    return (
      vinilo.titulo.trim() !== '' &&
      vinilo.artista.trim() !== '' &&
      vinilo.imagen.trim() !== '' &&
      vinilo.descripcion.length > 0 &&
      vinilo.descripcion[0].trim() !== '' &&
      vinilo.tracklist.length > 0 &&
      vinilo.tracklist[0].trim() !== '' &&
      vinilo.stock >= 0 &&  // Permitir el stock en 0
      vinilo.precio > 0
    );
   }

  editarVinilo(vinilo: Vinyl) {
    this.modoEdicion = true;
    this.viniloEditando = { ...vinilo };
  }

  async actualizarVinilo() {
    if (!this.viniloEditando) {
      return;
    }

    if (!this.validarVinilo(this.viniloEditando)) {
      await this.presentToast('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando vinilo...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      await firstValueFrom(this.databaseService.updateVinyl(this.viniloEditando));
      await this.presentToast('Vinilo actualizado exitosamente', 'success');
      this.modoEdicion = false;
      this.viniloEditando = null;
      await this.cargarVinilos();
    } catch (error) {
      console.error('Error al actualizar vinilo:', error);
      await this.presentToast('Error al actualizar el vinilo', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
  
    if (file.size > 5000000) {
      await this.presentToast('La imagen es demasiado grande. Máximo 5MB', 'warning');
      return;
    }
  
    try {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const photoData = e.target.result;
        if (this.modoEdicion && this.viniloEditando) {
          this.viniloEditando.imagen = photoData;
        } else {
          this.nuevoVinilo.imagen = photoData;
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      await this.presentToast('Error al procesar la imagen', 'danger');
    }
  }

  async eliminarVinilo(vinilo: Vinyl) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro que desea eliminar el vinilo "${vinilo.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Eliminando vinilo...',
              spinner: 'circular'
            });
            await loading.present();

            try {
              await firstValueFrom(this.databaseService.deleteVinyl(vinilo.id!));
              await this.presentToast('Vinilo eliminado exitosamente', 'success');
              await this.cargarVinilos();
            } catch (error) {
              console.error('Error al eliminar vinilo:', error);
              await this.presentToast('Error al eliminar el vinilo', 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.viniloEditando = null;
    this.nuevoVinilo = this.inicializarNuevoVinilo();
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}