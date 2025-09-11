import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CalendarEventsPage } from './calendar-events.page';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      { path: '', component: CalendarEventsPage }
    ])
  ],
  declarations: [CalendarEventsPage]
})
export class CalendarEventsPageModule {}
