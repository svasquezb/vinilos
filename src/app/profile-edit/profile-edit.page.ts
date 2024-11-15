import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController, AlertController } from '@ionic/angular';
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

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
  passwordData: PasswordChange = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
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
        await this.presentToast('Debe iniciar sesión para acceder a esta página', 'warning');
        this.navCtrl.navigateRoot('/login');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      await this.presentToast('Error al cargar los datos del usuario', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async saveUser() {
    if (!this.currentUser || !this.currentUser.id) {
      await this.presentToast('Error: No hay usuario para guardar', 'danger');
      return;
    }
  
    if (!this.validateUserData()) {
      return;
    }
  
    const loading = await this.presentLoading('Guardando cambios...');
  
    try {
      console.log('Datos a guardar:', this.currentUser);
      
      const userData = {
        id: this.currentUser.id,
        firstName: this.currentUser.firstName?.trim() || '',
        lastName: this.currentUser.lastName?.trim() || '',
        address: this.currentUser.address?.trim(),
        phoneNumber: this.currentUser.phoneNumber?.trim()
      };
  
      const result = await firstValueFrom(this.databaseService.updateUser(userData));
  
      if (result.success) {
        this.originalUser = { ...this.currentUser };
        await this.presentToast('Perfil actualizado con éxito', 'success');
        await this.loadCurrentUser();
      } else {
        throw new Error(result.error || 'Error al actualizar el perfil');
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      await this.presentToast(
        error.message || 'Error al guardar los cambios', 
        'danger'
      );
    } finally {
      await loading.dismiss();
    }
  }

  async changePassword() {
    if (!this.currentUser?.id) {
      await this.presentToast('Debe iniciar sesión para cambiar la contraseña', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Cambiar Contraseña',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Contraseña actual'
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirmar nueva contraseña'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar',
          handler: async (data) => {
            if (this.validatePasswordData(data)) {
              await this.updatePassword(data);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async updatePassword(data: PasswordChange) {
    const loading = await this.presentLoading('Actualizando contraseña...');
    
    try {
      const result = await firstValueFrom(
        this.databaseService.updateUserPassword(
          this.currentUser!.id!,
          data.currentPassword,
          data.newPassword
        )
      );

      if (result.success) {
        await this.presentToast('Contraseña actualizada con éxito', 'success');
      } else {
        throw new Error(result.error || 'Error al actualizar la contraseña');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      await this.presentToast(
        error.message || 'Error al actualizar la contraseña',
        'danger'
      );
    } finally {
      await loading.dismiss();
    }
  }

  private validatePasswordData(data: PasswordChange): boolean {
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      this.presentToast('Todos los campos son requeridos', 'warning');
      return false;
    }

    if (data.newPassword !== data.confirmPassword) {
      this.presentToast('Las contraseñas no coinciden', 'warning');
      return false;
    }

    if (data.newPassword.length < 6) {
      this.presentToast('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
      return false;
    }

    return true;
  }

  private validateUserData(): boolean {
    if (!this.currentUser) return false;
  
    // Validar campos requeridos
    if (!this.currentUser.firstName?.trim() || !this.currentUser.lastName?.trim()) {
      this.presentToast('El nombre y apellido son requeridos', 'warning');
      return false;
    }
  
    // Validar teléfono (si existe)
    if (this.currentUser.phoneNumber && !/^\d{9}$/.test(this.currentUser.phoneNumber.trim())) {
      this.presentToast('El número de teléfono debe tener 9 dígitos', 'warning');
      return false;
    }
  
    return true;
  }

  async onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.currentUser?.id) return;
  
    if (file.size > 5000000) {
      await this.presentToast('La imagen es demasiado grande. Máximo 5MB', 'warning');
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
            await this.presentToast('Foto actualizada con éxito', 'success');
          } else {
            throw new Error(result.error || 'Error al actualizar la foto');
          }
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error updating photo:', error);
      await this.presentToast('Error al procesar la imagen', 'danger');
    } finally {
      this.photoLoading = false;
      await loading.dismiss();
    }
  }

  hasUnsavedChanges(): boolean {
    if (!this.currentUser || !this.originalUser) return false;
    
    return (
      this.currentUser.firstName?.trim() !== this.originalUser.firstName?.trim() ||
      this.currentUser.lastName?.trim() !== this.originalUser.lastName?.trim() ||
      this.currentUser.address?.trim() !== this.originalUser.address?.trim() ||
      this.currentUser.phoneNumber?.trim() !== this.originalUser.phoneNumber?.trim()
    );
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color,
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