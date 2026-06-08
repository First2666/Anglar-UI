import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Appointments } from '../../data/appointments';
import { Pets } from '../../data/pets';
import { Owners } from '../../data/owners';
import { Vets } from '../../data/vets';
import { MedicalRecords } from '../../data/medical-records';

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    appointmentCount: number;
    appointmentLabels: string[];
}

@Component({
    selector: 'app-calendar',
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
    templateUrl: './calendar.html',
    styleUrl: './calendar.scss',
})
export class Calendar {
    private readonly apptStore = inject(Appointments);
    private readonly petsStore = inject(Pets);
    private readonly ownersStore = inject(Owners);
    private readonly vetsStore = inject(Vets);
    private readonly recordsStore = inject(MedicalRecords);

    readonly viewDate = signal(new Date());

    readonly appointments = computed(() => this.apptStore.appointments());
    readonly petNameById = computed(() => new Map(this.petsStore.pets().map((p) => [p.id, p.name] as const)));

    readonly monthLabel = computed(() => {
        const d = this.viewDate();
        return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    });

    readonly weeks = computed<CalendarDay[][]>(() => {
        const d = this.viewDate();
        const year = d.getFullYear();
        const month = d.getMonth();
        const today = new Date();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const apptByDay = new Map<string, string[]>();
        for (const a of this.appointments()) {
            const dateStr = new Date(a.startAt).toISOString().slice(0, 10);
            if (!apptByDay.has(dateStr)) apptByDay.set(dateStr, []);
            apptByDay.get(dateStr)!.push(`${this.petNameById().get(a.petId) ?? 'สัตว์'} – ${a.reason}`);
        }

        const days: CalendarDay[] = [];
        let startPad = firstDay.getDay();
        for (let i = startPad - 1; i >= 0; i--) {
            days.push(makeDay(new Date(year, month, -i), false, today, apptByDay));
        }
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(makeDay(new Date(year, month, d), true, today, apptByDay));
        }
        let endPad = 6 - lastDay.getDay();
        for (let i = 1; i <= endPad; i++) {
            days.push(makeDay(new Date(year, month + 1, i), false, today, apptByDay));
        }

        const weeks: CalendarDay[][] = [];
        for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
        return weeks;
    });

    prevMonth() { const d = this.viewDate(); this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
    nextMonth() { const d = this.viewDate(); this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
    today() { this.viewDate.set(new Date()); }
}

function makeDay(date: Date, isCurrentMonth: boolean, today: Date, apptByDay: Map<string, string[]>): CalendarDay {
    const dateStr = date.toISOString().slice(0, 10);
    const labels = apptByDay.get(dateStr) ?? [];
    return {
        date, isCurrentMonth,
        isToday: date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate(),
        appointmentCount: labels.length,
        appointmentLabels: labels,
    };
}
