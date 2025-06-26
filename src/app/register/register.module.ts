import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';  // Import IonicModule
import { FormsModule } from '@angular/forms';
import { RegisterComponent } from './register.component';  // Import Standalone Component

@NgModule({
  imports: [
    CommonModule,
    IonicModule,  // Add IonicModule here
    FormsModule,
    RegisterComponent  // Add RegisterComponent directly here (not in declarations)
  ]
})
export class RegisterPageModule {}
