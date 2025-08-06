import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';  // Import IonicModule
import { LoginComponent } from './login.component';  // Import Standalone Component

@NgModule({
  imports: [
    CommonModule,
    IonicModule,  // Add IonicModule here
    LoginComponent  // Add LoginComponent directly here (not in declarations)
  ],
  providers: [
  ]
})
export class LoginPageModule {}
