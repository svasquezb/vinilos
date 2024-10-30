import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViniloCrudPage } from './vinilo-crud.page';

const routes: Routes = [
  {
    path: '',
    component: ViniloCrudPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViniloCrudPageRoutingModule {}
