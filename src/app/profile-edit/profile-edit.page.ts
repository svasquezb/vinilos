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

  async ngOnInit() {
    await this.loadCurrentUser();
  }

  async ionViewWillEnter() {
    if (!this.currentUser) {
      await this.loadCurrentUser();
    }
  }

  async loadCurrentUser() {
    this.loading = true;
    
    try {
      const activeUser = this.databaseService.getCurrentUser();
      console.log('Usuario activo:', activeUser);
      
      if (activeUser) {
        this.currentUser = {
          id: activeUser.id,
          email: activeUser.email,
          firstName: activeUser.firstName || '',
          lastName: activeUser.lastName || '',
          address: activeUser.address || '',
          photo: activeUser.photo || '',
          role: activeUser.role || 'user',
          phoneNumber: activeUser.phoneNumber || ''
        };
        this.originalUser = { ...this.currentUser };
        console.log('Usuario cargado:', this.currentUser);
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

    if (!this.hasUnsavedChanges()) {
      await this.presentToast('No hay cambios para guardar');
      return;
    }

    const loading = await this.presentLoading('Guardando cambios...');

    try {
      console.log('Guardando usuario:', this.currentUser);
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
        this.originalUser = { ...this.currentUser };
        await this.presentToast('Perfil actualizado con éxito');
      } else {
        throw new Error(result.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      await this.presentToast('Error al guardar los cambios');
    } finally {
      await loading.dismiss();
    }
  }

  async onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.currentUser?.id) return;
  
    if (file.size > 5000000) { // Maximo 5mb 
      await this.presentToast('La imagen es demasiado grande. Máximo 5MB');
      return;
    }
  
    this.photoLoading = true;
    const loading = await this.presentLoading('Cargando imagen...');
  
    try {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        if (this.currentUser?.id) {
          const photoData = e.target.result;
          console.log('Subiendo foto para usuario:', this.currentUser.id);
          
          const result = await firstValueFrom(
            this.databaseService.updateUserPhoto(this.currentUser.id, photoData)
          );
  
          if (result.success) {
            this.currentUser.photo = photoData;
            await this.presentToast('Foto actualizada con éxito');
          } else {
            throw new Error(result.error || 'Error al actualizar la foto');
          }
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error updating photo:', error);
      await this.presentToast('Error al procesar la imagen');
    } finally {
      this.photoLoading = false;
      await loading.dismiss();
    }
  }

  hasUnsavedChanges(): boolean {
    if (!this.currentUser || !this.originalUser) return false;
    
    return (
      this.currentUser.firstName !== this.originalUser.firstName ||
      this.currentUser.lastName !== this.originalUser.lastName ||
      this.currentUser.address !== this.originalUser.address ||
      this.currentUser.phoneNumber !== this.originalUser.phoneNumber
    );
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