import { Pipe, PipeTransform } from '@angular/core';
import { formatAppDate } from '../../core/utils/formatters';

@Pipe({
  name: 'appDate',
  standalone: true,
})
export class AppDatePipe implements PipeTransform {
  transform(value: unknown): string {
    return formatAppDate(value);
  }
}
