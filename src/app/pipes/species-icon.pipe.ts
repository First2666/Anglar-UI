import { Pipe, PipeTransform } from '@angular/core';

/**
 * Maps pet species to Material Icons
 * Usage: {{ species | speciesIcon }}
 */
@Pipe({
  name: 'speciesIcon',
  standalone: true,
})
export class SpeciesIconPipe implements PipeTransform {
  private readonly iconMap: Record<string, string> = {
    Dog: 'pets',
    Cat: 'pets',
    Bird: 'flutter_dash',
    Rabbit: 'eco',
    Other: 'more_horiz',
  };

  transform(value: string | null | undefined): string {
    if (!value) return 'pets';
    return this.iconMap[value] || 'pets';
  }
}
