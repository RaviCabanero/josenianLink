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
    this.authService.getUserProfile().subscribe(profile => {
      console.log('User profile:', profile);
      this.userProfile = profile;
      this.userName = profile?.fullName || 'User';
    });
  }

  logout() {
    this.authService.logout();
  }

}
