import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { firstValueFrom } from 'rxjs';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss'],
})
export class UserManagementPage implements OnInit {
  users: User[] = [];
  loading = false;

  constructor(
    private databaseService: DatabaseService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    try {
      this.users = await firstValueFrom(this.databaseService.getAllUsers());
    } catch (error) {
      console.error('Error loading users:', error);
      await this.presentToast('Error al cargar usuarios', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async confirmDelete(user: User) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro que desea eliminar al usuario ${user.email}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteUser(user)
        }
      ],
      cssClass: 'custom-alert'
    });

    await alert.present();
  }

  private async deleteUser(user: User) {
    const loading = await this.loadingController.create({
      message: 'Eliminando usuario...',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      const result = await firstValueFrom(
        this.databaseService.deleteUser(user.id)
      );

      if (result.success) {
        await this.presentToast('Usuario eliminado correctamente', 'success');
        await this.loadUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      await this.presentToast(
        error.message || 'Error al eliminar usuario',
        'danger'
      );
    } finally {
      await loading.dismiss();
    }
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