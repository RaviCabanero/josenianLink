import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage {

  // Define the user object
  user = {
    name: 'Juan Dela Cruz',
    id: '2021009930',
    program: 'BSIT',
    yearGraduated: '2014',
    photo: 'assets/profile-placeholder.png' // default photo
  };

  constructor() {}

  // Method to handle profile update (can be linked to Firestore or API)
  updateProfile() {
    // Logic for updating profile, like opening a modal or linking to Firestore
    console.log('Profile updated!');
  }
}