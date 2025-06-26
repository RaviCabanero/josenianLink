import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';  // Import IonicModule
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';  // Import Standalone Component

@NgModule({
  imports: [
    CommonModule,
    IonicModule,  // Add IonicModule here
    FormsModule,
    LoginComponent  // Add LoginComponent directly here (not in declarations)
  ]
})
export class LoginPageModule {}
