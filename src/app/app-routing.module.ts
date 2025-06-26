import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';  // Import Standalone Component
import { RegisterComponent } from './register/register.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
    {
    path: 'login',
    component: LoginComponent  // Directly reference the standalone component
  },
  {
    path: 'register',
    component: RegisterComponent  // Directly reference the standalone component
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'employee-list',
    loadChildren: () => import('./employee-list/employee-list.module').then( m => m.EmployeeListPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'edit-employee/:id',
    loadChildren: () => import('./edit-employee/edit-employee.module').then( m => m.EditEmployeePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'add-employee',
    loadChildren: () => import('./add-employee/add-employee.module').then( m => m.AddEmployeePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'login'  // Fallback route for any unmatched paths
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
