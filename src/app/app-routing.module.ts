import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AdminPage } from './admin/admin.page';
import { FreedomWallPage } from './freedom-wall/freedom-wall.page';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
    {
      path: '',
      redirectTo: 'login',
      pathMatch: 'full'
    },
    {
      path: 'events',
      loadChildren: () => import('./calendar-events/calendar-events.module').then(m => m.CalendarEventsPageModule),
      canActivate: [AuthGuard]
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
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then( m => m.SettingsPageModule)
  },
  {
    path: 'admin',
    component: AdminPage,
    canActivate: [AdminGuard]
  },

  {
    path: 'freedom-wall',
    component: FreedomWallPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.page').then(m => m.NotificationsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'alumni',
    loadChildren: () => import('./alumni/alumni.module').then(m => m.AlumniPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'messages',
    loadComponent: () => import('./messages/messages.page').then(m => m.MessagesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'chat/:id',
    loadComponent: () => import('./chat/chat.page').then(m => m.ChatPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
