import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, createOutline, trashOutline, listOutline } from 'ionicons/icons';

interface Vinilo {
  id: number;
  titulo: string;
  artista: string;
  imagen: string;
  descripcion: string[];
  tracklist: string[];
  stock: number;
  precio: number;
}

type ViniloKeys = keyof Vinilo;

@Component({
  selector: 'app-vinilo-crud',
  templateUrl: './vinilo-crud.page.html',
  styleUrls: ['./vinilo-crud.page.scss'],
})
export class ViniloCrudPage implements OnInit {
  vinilos: Vinilo[] = [];
  nuevoVinilo: Vinilo = this.inicializarNuevoVinilo();
  modoEdicion = false;
  viniloEditando: Vinilo | null = null;
  activeSectionPage: 'add' | 'edit' | 'delete' | 'view' = 'view';

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private navCtrl: NavController
  ) {
    addIcons({ addCircleOutline, createOutline, trashOutline, listOutline });
  }

  ngOnInit() {
    this.loadVinilos();
  }

  loadVinilos() {
    this.vinilos = [
      {
        id: 1,
        titulo: 'Sempiternal',
        artista: 'Bring me the horizon',
        imagen: 'assets/img/sempiternal.jpg',
        descripcion: ['Álbum de rock alternativo lanzado en 2013'],
        tracklist: ['Can You Feel My Heart', 'The House of Wolves', 'Empire (Let Them Sing)'],
        stock: 10,
        precio: 35990
      },
    ];
  }

  inicializarNuevoVinilo(): Vinilo {
    return {
      id: 0,
      titulo: '',
      artista: '',
      imagen: '',
      descripcion: [],
      tracklist: [],
      stock: 0,
      precio: 0
    };
  }

  getViniloActual(): Vinilo {
    return this.modoEdicion ? this.viniloEditando! : this.nuevoVinilo;
  }

  actualizarCampo(campo: ViniloKeys, valor: any) {
    const viniloActual = this.getViniloActual();
    (viniloActual as any)[campo] = valor;
  }

  async crearVinilo() {
    if (this.validarVinilo(this.nuevoVinilo)) {
      this.nuevoVinilo.id = this.vinilos.length + 1;
      this.vinilos.push({...this.nuevoVinilo});
      await this.presentToast('Vinilo creado correctamente');
      this.nuevoVinilo = this.inicializarNuevoVinilo();
    } else {
      await this.mostrarAlerta('Error', 'Por favor, completa todos los campos requeridos y asegúrate de que el stock y el precio sean mayores que cero.');
    }
  }

  validarVinilo(vinilo: Vinilo): boolean {
    return (
      vinilo.titulo.trim() !== '' &&
      vinilo.artista.trim() !== '' &&
      vinilo.descripcion.length > 0 &&
      vinilo.tracklist.length > 0 &&
      vinilo.stock > 0 &&
      vinilo.precio > 0
    );
  }

  editarVinilo(vinilo: Vinilo) {
    this.modoEdicion = true;
    this.viniloEditando = {...vinilo};
    this.activeSectionPage = 'edit';
  }

  async actualizarVinilo() {
    if (this.viniloEditando && this.validarVinilo(this.viniloEditando)) {
      const index = this.vinilos.findIndex(v => v.id === this.viniloEditando!.id);
      if (index !== -1) {
        this.vinilos[index] = {...this.viniloEditando};
        this.modoEdicion = false;
        this.viniloEditando = null;
        await this.presentToast('Vinilo actualizado correctamente');
        this.activeSectionPage = 'view';
      }
    } else {
      await this.mostrarAlerta('Error', 'Por favor, completa todos los campos requeridos y asegúrate de que el stock y el precio sean mayores que cero.');
    }
  }

  async eliminarVinilo(vinilo: Vinilo) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar ${vinilo.titulo}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.vinilos = this.vinilos.filter(v => v.id !== vinilo.id);
            this.presentToast('Vinilo eliminado correctamente');
          }
        }
      ]
    });
    await alert.present();
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.viniloEditando = null;
    this.activeSectionPage = 'view';
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  setActiveSection(section: 'add' | 'edit' | 'delete' | 'view') {
    this.activeSectionPage = section;
    if (section !== 'edit') {
      this.cancelarEdicion();
    }
  }
}