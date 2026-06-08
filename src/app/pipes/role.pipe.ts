import { Pipe, PipeTransform } from '@angular/core';

/**
 * Section 07 – Custom Pipe
 * แปลง role string เป็นภาษาไทย พร้อม icon
 * Usage: {{ user.role | roleLabel }}
 *        {{ user.role | roleLabel:'icon' }}
 */
@Pipe({
  name: 'roleLabel',
  standalone: true,
})
export class RolePipe implements PipeTransform {
  private readonly roleMap: Record<string, { label: string; icon: string; color: string }> = {
    admin:        { label: 'ผู้ดูแลระบบ',      icon: 'admin_panel_settings', color: '#e74c3c' },
    vet:          { label: 'สัตวแพทย์',         icon: 'medical_services',     color: '#2ecc71' },
    receptionist: { label: 'พนักงานต้อนรับ',   icon: 'support_agent',        color: '#3498db' },
    owner:        { label: 'เจ้าของสัตว์เลี้ยง', icon: 'person',              color: '#f39c12' },
  };

  transform(value: string | null | undefined, format: 'label' | 'icon' | 'color' = 'label'): string {
    if (!value) return '';
    const entry = this.roleMap[value];
    if (!entry) return value;
    return entry[format];
  }
}
