import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { VinilosPageRoutingModule } from './vinilos-routing.module';
import { VinilosPage } from './vinilos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VinilosPageRoutingModule
  ],
  declarations: [VinilosPage]
})
export class VinilosPageModule {}