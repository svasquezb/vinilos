import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViniloCrudPageRoutingModule } from './vinilo-crud-routing.module';

import { ViniloCrudPage } from './vinilo-crud.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViniloCrudPageRoutingModule
  ],
  declarations: [ViniloCrudPage]
})
export class ViniloCrudPageModule {}
