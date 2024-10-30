import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VinilosPage } from './vinilos.page';

const routes: Routes = [
  {
    path: '',
    component: VinilosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VinilosPageRoutingModule {}
