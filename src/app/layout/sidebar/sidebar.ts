import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppConfigService } from '../../core/services/app-config.service';

type IconKey = 'dashboard' | 'devices' | 'logs' | 'attendance' | 'upload' | 'resync' | 'users' | 'guide';

interface NavItem {
  path: string;
  label: string;
  icon: IconKey;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  private readonly appConfig = inject(AppConfigService);

  /** Controls the drawer's visibility on small screens; ignored above the lg breakpoint. */
  @Input() open = false;
  @Output() readonly closeRequested = new EventEmitter<void>();

  protected readonly navSections: NavSection[] = [
    {
      label: 'Overview',
      items: [{ path: '/dashboard', label: 'Dashboard', icon: 'dashboard' }]
    },
    {
      label: 'Operations',
      items: [
        { path: '/devices', label: 'Devices', icon: 'devices' },
        { path: '/attendance', label: 'Attendance', icon: 'attendance' },
        { path: '/attendance-upload', label: 'Bulk Attendance Upload', icon: 'upload' },
        ...(this.appConfig.get().showResyncScreen
          ? [{ path: '/resync', label: 'Re-sync', icon: 'resync' as const }]
          : []),
        { path: '/device-users', label: 'Device Users', icon: 'users' },
        { path: '/logs', label: 'Raw Logs', icon: 'logs' }
      ]
    },
    {
      label: 'Resources',
      items: [{ path: '/setup-guide', label: 'Setup Guide', icon: 'guide' }]
    }
  ];

  protected onNavClick(): void {
    this.closeRequested.emit();
  }
}
