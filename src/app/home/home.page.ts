import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  userProfile: any = null;
  userName: string = 'User';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
      console.log('User role check:', result);
      this.userProfile = result.userProfile;
      this.userName = result.userProfile?.fullName || 'User';
      
      // If user is admin, they can still access home page but will see their admin name
      if (result.isAdmin) {
        this.userName = 'Administrator';
      }
    });
  }

  logout() {
    this.authService.logout();
  }

}
