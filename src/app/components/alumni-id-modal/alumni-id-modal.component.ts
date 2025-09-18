import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-alumni-id-modal',
  templateUrl: './alumni-id-modal.component.html',
  styleUrls: ['./alumni-id-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class AlumniIdModalComponent {
  @Input() alumniId: string = '';
  @Input() userName: string = '';
  @Input() userEmail: string = '';
  @Input() userPhoto: string = '';

  constructor(private modalController: ModalController) {}

  closeModal() {
    this.modalController.dismiss();
  }

  async downloadId() {
    // Future implementation: Generate and download ID card as PDF/Image
    console.log('Download ID functionality to be implemented');
  }

  async shareId() {
    // Future implementation: Share alumni ID
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My USJR Alumni ID',
          text: `My USJR Alumni ID: ${this.alumniId}`,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString();
  }

  getExpiryDate(): string {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 5); // Valid for 5 years
    return expiryDate.toLocaleDateString();
  }
}
