import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

interface User {
  email: string;
  role: string;
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
    { email: 'admin@example.com', role: 'admin', name: 'Admin', lastName: 'User', address: 'Admin St', photo: '' },
    { email: 'user@example.com', role: 'user', name: 'Normal', lastName: 'User', address: 'User St', photo: '' }
  ];
  
  currentUser: User | null = null;
  newPassword: string = '';
  isAdmin: boolean = false;
  loading: boolean = false;
  photoLoading: boolean = false;

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.checkLoginStatus();
  }

  async checkLoginStatus() {
    if (!this.authService.isLoggedIn) {
      await this.presentToast('Acceso denegado. Por favor, inicie sesión.');
      this.navCtrl.navigateRoot('/home');
      return;
    }

    this.isAdmin = this.authService.userRole === 'admin';
    await this.loadCurrentUser();
  }

  async loadCurrentUser() {
    this.loading = true;
    const userEmail = this.authService.userEmail;
    
    if (!userEmail) {
      await this.presentToast('Error: No se encontró el email del usuario');
      this.loading = false;
      return;
    }

    // Simulamos una carga asíncrona
    setTimeout(() => {
      this.currentUser = this.users.find(u => u.email === userEmail) || null;
      
      if (!this.currentUser) {
        this.currentUser = {
          email: userEmail,
          role: this.authService.userRole || 'user',
          name: '',
          lastName: '',
          address: '',
          photo: ''
        };
        this.users.push(this.currentUser);
      }
      
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

  async deleteUser(email: string) {
    if (!this.isAdmin) {
      await this.presentToast('Solo los administradores pueden eliminar usuarios.');
      return;
    }

    if (email === this.authService.userEmail) {
      await this.presentToast('No puedes eliminar tu propio usuario.');
      return;
    }

    const loading = await this.presentLoading('Eliminando usuario...');

    try {
      this.users = this.users.filter(user => user.email !== email);
      await this.presentToast('Usuario eliminado con éxito.');
    } catch (error) {
      await this.presentToast('Error al eliminar el usuario.');
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
      // Aquí iría la lógica para actualizar la contraseña en el backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación de llamada al backend
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