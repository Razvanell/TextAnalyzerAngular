// src/app/side-nav/side-nav.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.css'],
})
export class SideNavComponent implements OnInit {
  selectedModel: string = '/analyze';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Set initial selection based on the current route
    this.selectedModel = this.router.url;

    // Listen for route changes to update the dropdown selection
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.selectedModel = event.urlAfterRedirects; // Update selection to new route
      });
  }

  // Method to handle dropdown selection change and navigate
  navigateToModel(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedRoute = target.value;
    this.router.navigate([selectedRoute]);
  }
}