import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';

interface User {
  id?: number;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  phoneNumber?: string;
  role?: string;
  address?: string;
  photo?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  styleUrls: ['./profile-edit.page.scss'],
})
export class ProfileEditPage implements OnInit {
  currentUser: User | null = null;
  loading: boolean = false;
  photoLoading: boolean = false;
  originalUser: User | null = null;

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
  }

  async loadCurrentUser() {
    this.loading = true;
    
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        this.currentUser = {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          address: userData.address || '',
          photo: userData.photo || '',
          role: userData.role || 'user',
          phoneNumber: userData.phoneNumber || ''
        };
        this.originalUser = { ...this.currentUser };
      } else {
        await this.presentToast('Debe iniciar sesión para acceder a esta página');
        this.navCtrl.navigateRoot('/login');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      await this.presentToast('Error al cargar los datos del usuario');
    } finally {
      this.loading = false;
    }
  }

  async saveUser() {
    if (!this.currentUser || !this.currentUser.id) {
      await this.presentToast('Error: No hay usuario para guardar');
      return;
    }

    const loading = await this.presentLoading('Guardando cambios...');

    try {
      const result = await firstValueFrom(
        this.databaseService.updateUser({
          id: this.currentUser.id,
          firstName: this.currentUser.firstName,
          lastName: this.currentUser.lastName,
          address: this.currentUser.address,
          phoneNumber: this.currentUser.phoneNumber
        })
      );

      if (result.success) {
        // Actualizar localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const updatedUser = { ...userData, ...this.currentUser };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        this.originalUser = { ...this.currentUser };
        await this.presentToast('Perfil actualizado con éxito');
      } else {
        throw new Error(result.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      await this.presentToast('Error al guardar los cambios');
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
      reader.onload = async (e: any) => {
        if (this.currentUser && this.currentUser.id) {
          const photoData = e.target.result;
          
          const result = await firstValueFrom(
            this.databaseService.updateUserPhoto(this.currentUser.id, photoData)
          );

          if (result.success) {
            this.currentUser.photo = photoData;
            
            // Actualizar localStorage
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
              const userData = JSON.parse(storedUser);
              userData.photo = photoData;
              localStorage.setItem('currentUser', JSON.stringify(userData));
            }
            
            await this.presentToast('Foto actualizada con éxito');
          } else {
            throw new Error('Error al actualizar la foto');
          }
        }
      };
      
      reader.onerror = () => {
        throw new Error('Error al leer el archivo');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error updating photo:', error);
      await this.presentToast('Error al procesar la imagen');
    } finally {
      this.photoLoading = false;
      loading.dismiss();
    }
  }

  hasUnsavedChanges(): boolean {
    if (!this.currentUser || !this.originalUser) return false;
    
    return JSON.stringify(this.currentUser) !== JSON.stringify(this.originalUser);
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