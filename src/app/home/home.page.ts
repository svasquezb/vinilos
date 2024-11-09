import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService, CartVinyl } from '../services/cart.service';
import { Vinyl } from '../models/vinilos.model';  
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  vinilosDestacados: Vinyl[] = [
    {
      id: 5,
      titulo: 'Sempiternal',
      artista: 'Bring me the horizon',
      imagen: 'assets/img/sempiternal.jpg',
      descripcion: [
        'Sempiternal es el cuarto álbum de estudio de la banda de rock británica Bring Me the Horizon. Fue lanzado el 1 de abril de 2013 en todo el mundo a través de RCA Records, un sello subsidiario de Sony Music, y el 2 de abril de 2013 en los Estados Unidos y Canadá a través de Epitaph Records.'
      ],
      tracklist: [
        'Can You Feel My Heart',
        'The House of Wolves',
        'Empire (Let Them Sing)',
        'Sleepwalking',
        'Go to Hell, for Heavens Sake',
        'Shadow Moses',
        'And the Snakes Start to Sing',
        'Seen It All Before',
        'Antivist',
        'Crooked Young',
        'Hospital for Souls'
      ],
      stock: 10,
      precio: 35990,
      IsAvailable: true
    },
    {
      id: 6,
      titulo: 'That the spirit',
      artista: 'Bring me the horizon',
      imagen: 'assets/img/spirit.jpg',
      descripcion: [
        'Thats the Spirit —en español: Ese es el espíritu— es el nombre del quinto álbum de estudio de la banda británica Bring Me the Horizon. Fue lanzado el 11 de septiembre de 2015,  y marca un sonido bastante alejado al de sus orígenes como una banda de metalcore.'
      ],
      tracklist: [
        'Doomed',
        'Happy Song',
        'Throne',
        'True Friends',
        'Follow You',
        'What You Need',
        'Avalanche',
        'Run',
        'Drown',
        'Blasphemy',
        'Oh No'
      ],
      stock: 10,
      precio: 41990,
      IsAvailable: true
    },
    {
      id: 7,
      titulo: 'Anti-icon',
      artista: 'Ghostemane',
      imagen: 'assets/img/anti.jpg',
      descripcion: [],
      tracklist: [
        'Intro.Destitute',
        'Vagabond',
        'Lazaretto',
        'Sacrilege',
        'AI',
        'Fed Up',
        'The Winds of Change',
        'Hydrochloride',
        'Hellrap',
        'Anti-Social Masochistic Rage [ASMR]',
        'Melanchoholic',
        'Calamity',
        'Falling Down'
      ],
      stock: 10,
      precio: 33900,
      IsAvailable: true
    },
  ];

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
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.startBannerRotation();
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
  }

  cerrarDescripcion() {
    this.viniloSeleccionado = null;
  }

  async agregarAlCarrito() {
    if (this.viniloSeleccionado) {
      this.cartService.addToCart(this.viniloSeleccionado);
      await this.presentToast(`${this.viniloSeleccionado.titulo} agregado al carrito`);
      this.cerrarDescripcion();
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