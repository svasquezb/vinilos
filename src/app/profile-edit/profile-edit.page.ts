import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';

interface User {
  email: string;
  name: string;
  lastName: string;
  address: string;
  photo: string;
}

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  styleUrls: ['./profile-edit.page.scss'],
})
export class ProfileEditPage implements OnInit {
  users: User[] = [
    { email: 'user@example.com', name: 'Normal', lastName: 'User', address: 'User St', photo: '' }
  ];
  
  currentUser: User | null = null;
  newPassword: string = '';
  loading: boolean = false;
  photoLoading: boolean = false;

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
  }

  async loadCurrentUser() {
    this.loading = true;
    
    // Simulamos una carga asíncrona con un usuario por defecto
    setTimeout(() => {
      this.currentUser = this.users[0];
      this.loading = false;
    }, 1000);
  }

  async saveUser() {
    if (!this.currentUser) {
      await this.presentToast('Error: No hay usuario para guardar');
      return;
    }

    const loading = await this.presentLoading('Guardando cambios...');

    try {
      const index = this.users.findIndex(u => u.email === this.currentUser?.email);
      if (index > -1) {
        this.users[index] = { ...this.currentUser };
        await this.presentToast('Perfil actualizado con éxito.');
      } else {
        this.users.push({ ...this.currentUser });
        await this.presentToast('Perfil creado con éxito.');
      }
    } catch (error) {
      await this.presentToast('Error al guardar los cambios.');
    } finally {
      loading.dismiss();
    }
  }

  async updatePassword() {
    if (!this.newPassword.trim()) {
      await this.presentToast('Por favor, ingrese una nueva contraseña.');
      return;
    }

    const loading = await this.presentLoading('Actualizando contraseña...');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
      await this.presentToast('Contraseña actualizada con éxito.');
      this.newPassword = '';
    } catch (error) {
      await this.presentToast('Error al actualizar la contraseña.');
    } finally {
      loading.dismiss();
    }
  }

  async onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.currentUser) return;

    this.photoLoading = true;
    const loading = await this.presentLoading('Cargando imagen...');

    try {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.currentUser) {
          this.currentUser.photo = e.target.result;
          this.photoLoading = false;
          loading.dismiss();
          this.presentToast('Foto actualizada con éxito.');
        }
      };
      reader.onerror = () => {
        this.photoLoading = false;
        loading.dismiss();
        this.presentToast('Error al cargar la imagen.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      this.photoLoading = false;
      loading.dismiss();
      await this.presentToast('Error al procesar la imagen.');
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  async presentLoading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();
    return loading;
  }
}